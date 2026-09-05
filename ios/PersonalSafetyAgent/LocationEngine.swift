import Foundation
import CoreLocation
import UIKit

public enum NativeMovementState: String {
    case driving = "DRIVING"
    case active = "ACTIVE"
    case stationary = "STATIONARY"
}

public protocol LocationEngineDelegate: AnyObject {
    func didUpdateLocation(location: CLLocation, movementState: NativeMovementState, isLowPowerMode: Bool)
    func didChangeAuthorizationStatus(status: CLAuthorizationStatus)
}

public class LocationEngine: NSObject, CLLocationManagerDelegate {
    public static let shared = LocationEngine()
    
    private let locationManager = CLLocationManager()
    public weak var delegate: LocationEngineDelegate?
    
    public private(set) var isTrackingActive: Bool = false
    public private(set) var lastLocation: CLLocation?
    public private(set) var lastServerSyncDate: Date?
    public private(set) var currentMovementState: NativeMovementState = .stationary
    
    private var syncWatchdogTimer: Timer?
    private var backendUrl: URL?
    private var deviceId: String
    
    private override init() {
        // Persistent installation ID
        if let storedId = UserDefaults.standard.string(forKey: "psa_device_id") {
            self.deviceId = storedId
        } else {
            let newId = "ios-" + UUID().uuidString.prefix(12)
            UserDefaults.standard.set(newId, forKey: "psa_device_id")
            self.deviceId = newId
        }
        
        super.init()
        locationManager.delegate = self
        locationManager.desiredAccuracy = kCLLocationAccuracyBestForNavigation
        locationManager.distanceFilter = 100 // Default 100 meters
        
        // Background configuration (Apple Core Location standard)
        locationManager.allowsBackgroundLocationUpdates = true
        locationManager.pausesLocationUpdatesAutomatically = false
        locationManager.showsBackgroundLocationIndicator = true
        locationManager.activityType = .automotiveNavigation
    }
    
    public func configureBackend(url: URL) {
        self.backendUrl = url
    }
    
    public func getDeviceId() -> String {
        return self.deviceId
    }
    
    // MARK: - Authorization
    public func requestPermissions() {
        let status = locationManager.authorizationStatus
        if status == .notDetermined {
            locationManager.requestWhenInUseAuthorization()
        } else if status == .authorizedWhenInUse {
            locationManager.requestAlwaysAuthorization()
        }
    }
    
    // MARK: - Start / Stop Protection
    public func startProtection() {
        guard !isTrackingActive else { return }
        
        requestPermissions()
        isTrackingActive = true
        
        // Ensure automotive navigation mode for driving safety
        locationManager.activityType = .automotiveNavigation
        locationManager.desiredAccuracy = kCLLocationAccuracyBestForNavigation
        locationManager.startUpdatingLocation()
        
        // Start 3-minute failsafe timer (Guarantees server location is never older than ~5 minutes during driving)
        syncWatchdogTimer?.invalidate()
        syncWatchdogTimer = Timer.scheduledTimer(withTimeInterval: 180.0, repeats: true) { [weak self] _ in
            self?.evaluateFailsafeSync()
        }
        
        print("[LocationEngine] Background protection started.")
    }
    
    public func stopProtection() {
        guard isTrackingActive else { return }
        isTrackingActive = false
        locationManager.stopUpdatingLocation()
        syncWatchdogTimer?.invalidate()
        syncWatchdogTimer = nil
        print("[LocationEngine] Protection stopped.")
    }
    
    // MARK: - Adaptive Tracking Strategy
    public func locationManager(_ manager: CLLocationManager, didUpdateLocations locations: [CLLocation]) {
        guard let location = locations.last else { return }
        
        // Filter out highly inaccurate GPS samples (> 500m)
        guard location.horizontalAccuracy >= 0 && location.horizontalAccuracy <= 500 else { return }
        
        let speed = location.speed // m/s
        let previousState = currentMovementState
        
        // Adaptive state determination
        if speed > 4.0 { // > ~14.5 km/h -> DRIVING
            currentMovementState = .driving
            locationManager.desiredAccuracy = kCLLocationAccuracyBestForNavigation
            locationManager.distanceFilter = 250 // 250m updates while driving
        } else if speed > 1.0 {
            currentMovementState = .active
            locationManager.desiredAccuracy = kCLLocationAccuracyNearestTenMeters
            locationManager.distanceFilter = 100
        } else {
            currentMovementState = .stationary
            locationManager.desiredAccuracy = kCLLocationAccuracyHundredMeters
            locationManager.distanceFilter = 300 // Save battery when stationary
        }
        
        // Determine whether to sync with backend immediately:
        // 1. Distance moved >= 500 meters
        // 2. Movement state changed (e.g. from stationary to driving)
        // 3. Last sync is older than 3 minutes (180s)
        var shouldSync = false
        let isLowPower = ProcessInfo.processInfo.isLowPowerModeEnabled
        
        if let lastLoc = lastLocation {
            let distanceMoved = location.distance(from: lastLoc)
            if currentMovementState == .driving && distanceMoved >= 500 {
                shouldSync = true
            } else if previousState != currentMovementState && currentMovementState == .driving {
                shouldSync = true
            } else if let lastSync = lastServerSyncDate, Date().timeIntervalSince(lastSync) >= 180 {
                shouldSync = true
            }
        } else {
            shouldSync = true // First point
        }
        
        lastLocation = location
        delegate?.didUpdateLocation(location: location, movementState: currentMovementState, isLowPowerMode: isLowPower)
        
        if shouldSync {
            syncLocationToBackend(location: location, isLowPower: isLowPower)
        }
    }
    
    public func locationManagerDidChangeAuthorization(_ manager: CLLocationManager) {
        delegate?.didChangeAuthorizationStatus(status: manager.authorizationStatus)
        if manager.authorizationStatus == .authorizedWhenInUse {
            manager.requestAlwaysAuthorization()
        }
    }
    
    public func locationManager(_ manager: CLLocationManager, didFailWithError error: Error) {
        print("[LocationEngine] Core Location error: \(error.localizedDescription)")
    }
    
    // MARK: - Backend Transmission
    private func syncLocationToBackend(location: CLLocation, isLowPower: Bool) {
        guard let url = backendUrl?.appendingPathComponent("api/device/location") else { return }
        
        let payload: [String: Any] = [
            "deviceId": deviceId,
            "latitude": location.coordinate.latitude,
            "longitude": location.coordinate.longitude,
            "horizontalAccuracy": location.horizontalAccuracy,
            "speed": location.speed >= 0 ? location.speed : 0,
            "course": location.course >= 0 ? location.course : 0,
            "timestamp": Int64(location.timestamp.timeIntervalSince1970 * 1000),
            "source": "CoreLocation_iOS",
            "isLowPowerMode": isLowPower
        ]
        
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = try? JSONSerialization.data(withJSONObject: payload)
        
        URLSession.shared.dataTask(with: request) { [weak self] _, response, error in
            if let httpRes = response as? HTTPURLResponse, httpRes.statusCode == 200 {
                DispatchQueue.main.async {
                    self?.lastServerSyncDate = Date()
                    print("[LocationEngine] Location successfully synced to backend.")
                }
            } else if let error = error {
                print("[LocationEngine] Sync error: \(error.localizedDescription)")
            }
        }.resume()
    }
    
    private func evaluateFailsafeSync() {
        guard isTrackingActive, let loc = lastLocation else { return }
        let now = Date()
        if let lastSync = lastServerSyncDate, now.timeIntervalSince(lastSync) >= 240 {
            // Approaching 4-5 minutes without sync: enforce sync point!
            print("[LocationEngine] Failsafe timer triggering sync.")
            syncLocationToBackend(location: loc, isLowPower: ProcessInfo.processInfo.isLowPowerModeEnabled)
        }
    }
}
