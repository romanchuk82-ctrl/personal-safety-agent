import Foundation
import WebKit
import CoreLocation

public class NativeBridge: NSObject, WKScriptMessageHandler, LocationEngineDelegate, NotificationEngineDelegate {
    public weak var webView: WKWebView?
    
    public override init() {
        super.init()
        LocationEngine.shared.delegate = self
        NotificationEngine.shared.delegate = self
    }
    
    // MARK: - WKScriptMessageHandler (Web -> Native)
    public func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
        guard message.name == "psaNative", let body = message.body as? [String: Any] else { return }
        guard let action = body["action"] as? String else { return }
        
        print("[NativeBridge] Received action from Web: \(action)")
        
        switch action {
        case "ACTIVATE_PROTECTION":
            LocationEngine.shared.startProtection()
            NotificationEngine.shared.requestNotificationPermissions()
            pushStatusToWeb()
            
        case "DEACTIVATE_PROTECTION":
            LocationEngine.shared.stopProtection()
            pushStatusToWeb()
            
        case "PREVIEW_SOUND":
            NotificationEngine.shared.playPreviewSound()
            
        case "GET_NATIVE_STATUS":
            pushStatusToWeb()
            
        case "TRIGGER_TEST_ALARM":
            // Trigger local sound & push test via NotificationEngine
            NotificationEngine.shared.playPreviewSound()
            pushStatusToWeb()
            
        case "SCHEDULE_LOCAL_ALERT":
            if let title = body["title"] as? String, let alertBody = body["body"] as? String {
                NotificationEngine.shared.scheduleLocalAlert(title: title, body: alertBody)
            }
            pushStatusToWeb()
            
        default:
            print("[NativeBridge] Unknown action: \(action)")
        }
    }
    
    // MARK: - Native -> Web Dispatch
    public func pushStatusToWeb() {
        let loc = LocationEngine.shared.lastLocation
        let signing = SigningHealthEngine.shared.checkHealth()
        let status: [String: Any] = [
            "isNativeIos": true,
            "protectionActive": LocationEngine.shared.isTrackingActive,
            "deviceId": LocationEngine.shared.getDeviceId(),
            "movementState": LocationEngine.shared.currentMovementState.rawValue,
            "isCriticalAlertsEnabled": NotificationEngine.shared.isCriticalAlertsAuthorized,
            "apnsToken": NotificationEngine.shared.apnsToken ?? "",
            "isLowPowerMode": ProcessInfo.processInfo.isLowPowerModeEnabled,
            "latitude": loc?.coordinate.latitude ?? 0,
            "longitude": loc?.coordinate.longitude ?? 0,
            "accuracy": loc?.horizontalAccuracy ?? -1,
            "speed": loc?.speed ?? -1,
            "lastServerSync": LocationEngine.shared.lastServerSyncDate?.timeIntervalSince1970 ?? 0,
            "signingHealth": [
                "daysRemaining": signing.daysRemaining,
                "expirationDate": signing.expirationDate?.timeIntervalSince1970 ?? 0,
                "teamName": signing.teamName ?? "Personal Team",
                "isProfileValid": signing.isProfileValid,
                "autoRefreshMechanism": signing.autoRefreshMechanism
            ]
        ]
        
        guard let jsonData = try? JSONSerialization.data(withJSONObject: status),
              let jsonString = String(data: jsonData, encoding: .utf8) else { return }
        
        let js = "if (window.__onNativeStatusUpdate) { window.__onNativeStatusUpdate(\(jsonString)); }"
        DispatchQueue.main.async { [weak self] in
            self?.webView?.evaluateJavaScript(js, completionHandler: nil)
        }
    }
    
    // MARK: - LocationEngineDelegate
    public func didUpdateLocation(location: CLLocation, movementState: NativeMovementState, isLowPowerMode: Bool) {
        let locData: [String: Any] = [
            "latitude": location.coordinate.latitude,
            "longitude": location.coordinate.longitude,
            "accuracy": location.horizontalAccuracy,
            "speed": location.speed,
            "course": location.course,
            "timestamp": location.timestamp.timeIntervalSince1970 * 1000,
            "movementState": movementState.rawValue,
            "isLowPowerMode": isLowPowerMode
        ]
        
        guard let jsonData = try? JSONSerialization.data(withJSONObject: locData),
              let jsonString = String(data: jsonData, encoding: .utf8) else { return }
        
        let js = "if (window.__onNativeLocationUpdate) { window.__onNativeLocationUpdate(\(jsonString)); }"
        DispatchQueue.main.async { [weak self] in
            self?.webView?.evaluateJavaScript(js, completionHandler: nil)
        }
    }
    
    public func didChangeAuthorizationStatus(status: CLAuthorizationStatus) {
        pushStatusToWeb()
    }
    
    // MARK: - NotificationEngineDelegate
    public func didRegisterApnsToken(token: String) {
        pushStatusToWeb()
        let js = "if (window.__onNativeApnsToken) { window.__onNativeApnsToken('\(token)'); }"
        DispatchQueue.main.async { [weak self] in
            self?.webView?.evaluateJavaScript(js, completionHandler: nil)
        }
    }
    
    public func didUpdateCriticalAlertStatus(isEnabled: Bool) {
        pushStatusToWeb()
    }
    
    public func didReceiveAlertNotification(title: String, body: String, isCritical: Bool) {
        pushStatusToWeb()
    }
}
