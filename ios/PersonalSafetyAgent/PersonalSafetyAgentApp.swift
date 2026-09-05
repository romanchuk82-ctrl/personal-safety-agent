import SwiftUI
import UIKit

@main
struct PersonalSafetyAgentApp: App {
    @UIApplicationDelegateAdaptor(AppDelegate.self) var appDelegate
    
    var body: some Scene {
        WindowGroup {
            ContentView()
        }
    }
}

class AppDelegate: NSObject, UIApplicationDelegate {
    func application(
        _ application: UIApplication,
        didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
    ) -> Bool {
        print("[PersonalSafetyAgentApp] Native iOS Agent launched.")
        
        // Check initial notification settings
        NotificationEngine.shared.checkCriticalAlertStatus()
        
        return true
    }
    
    func application(
        _ application: UIApplication,
        didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data
    ) {
        NotificationEngine.shared.setApnsToken(deviceToken: deviceToken)
    }
    
    func application(
        _ application: UIApplication,
        didFailToRegisterForRemoteNotificationsWithError error: Error
    ) {
        print("[PersonalSafetyAgentApp] Failed to register for remote notifications: \(error.localizedDescription)")
    }
}
