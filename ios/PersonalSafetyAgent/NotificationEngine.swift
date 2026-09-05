import Foundation
import UserNotifications
import UIKit
import AVFoundation

public protocol NotificationEngineDelegate: AnyObject {
    func didRegisterApnsToken(token: String)
    func didUpdateCriticalAlertStatus(isEnabled: Bool)
    func didReceiveAlertNotification(title: String, body: String, isCritical: Bool)
}

public class NotificationEngine: NSObject, UNUserNotificationCenterDelegate {
    public static let shared = NotificationEngine()
    
    public weak var delegate: NotificationEngineDelegate?
    public private(set) var apnsToken: String?
    public private(set) var isCriticalAlertsAuthorized: Bool = false
    private var audioPlayer: AVAudioPlayer?
    
    private override init() {
        super.init()
        UNUserNotificationCenter.current().delegate = self
    }
    
    // MARK: - Permissions & Registration
    public func requestNotificationPermissions() {
        var options: UNAuthorizationOptions = [.alert, .sound, .badge]
        
        // Critical alerts option (prepared for Apple entitlement)
        if #available(iOS 12.0, *) {
            options.insert(.criticalAlert)
        }
        
        UNUserNotificationCenter.current().requestAuthorization(options: options) { [weak self] granted, error in
            DispatchQueue.main.async {
                if granted {
                    UIApplication.shared.registerForRemoteNotifications()
                    self?.checkCriticalAlertStatus()
                } else if let error = error {
                    print("[NotificationEngine] Auth error: \(error.localizedDescription)")
                }
            }
        }
    }
    
    public func checkCriticalAlertStatus() {
        UNUserNotificationCenter.current().getNotificationSettings { [weak self] settings in
            DispatchQueue.main.async {
                let isCrit = settings.criticalAlertSetting == .enabled
                self?.isCriticalAlertsAuthorized = isCrit
                self?.delegate?.didUpdateCriticalAlertStatus(isEnabled: isCrit)
                print("[NotificationEngine] Critical Alert Authorized: \(isCrit)")
            }
        }
    }
    
    public func setApnsToken(deviceToken: Data) {
        let token = deviceToken.map { String(format: "%02.2hhx", $0) }.joined()
        self.apnsToken = token
        UserDefaults.standard.set(token, forKey: "psa_apns_token")
        delegate?.didRegisterApnsToken(token: token)
        print("[NotificationEngine] Registered APNs token: \(token)")
    }
    
    // MARK: - Local Sound Preview & Alert
    public func scheduleLocalAlert(title: String, body: String) {
        let content = UNMutableNotificationContent()
        content.title = title
        content.body = body
        content.sound = UNNotificationSound.default
        
        let request = UNNotificationRequest(identifier: UUID().uuidString, content: content, trigger: nil)
        UNUserNotificationCenter.current().add(request) { error in
            if let error = error {
                print("[NotificationEngine] Error scheduling local alert: \(error.localizedDescription)")
            }
        }
        playPreviewSound()
    }

    public func playPreviewSound() {
        guard let soundUrl = Bundle.main.url(forResource: "danger_alarm", withExtension: "wav") else {
            print("[NotificationEngine] danger_alarm.wav not found in bundle.")
            return
        }
        
        do {
            try AVAudioSession.sharedInstance().setCategory(.playback, mode: .default, options: [.duckOthers])
            try AVAudioSession.sharedInstance().setActive(true)
            
            audioPlayer = try AVAudioPlayer(contentsOf: soundUrl)
            audioPlayer?.volume = 1.0
            audioPlayer?.play()
            print("[NotificationEngine] Playing preview sound.")
        } catch {
            print("[NotificationEngine] Audio playback error: \(error.localizedDescription)")
        }
    }
    
    // MARK: - UNUserNotificationCenterDelegate
    public func userNotificationCenter(
        _ center: UNUserNotificationCenter,
        willPresent notification: UNNotification,
        withCompletionHandler completionHandler: @escaping (UNNotificationPresentationOptions) -> Void
    ) {
        let content = notification.request.content
        let isCrit = content.sound != nil // Critical or custom sound
        delegate?.didReceiveAlertNotification(title: content.title, body: content.body, isCritical: isCrit)
        
        // Present banner and play custom sound even in foreground
        if #available(iOS 14.0, *) {
            completionHandler([.banner, .sound, .badge, .list])
        } else {
            completionHandler([.alert, .sound, .badge])
        }
    }
    
    public func userNotificationCenter(
        _ center: UNUserNotificationCenter,
        didReceive response: UNNotificationResponse,
        withCompletionHandler completionHandler: @escaping () -> Void
    ) {
        let content = response.notification.request.content
        delegate?.didReceiveAlertNotification(title: content.title, body: content.body, isCritical: true)
        completionHandler()
    }
}
