import SwiftUI

public struct ContentView: View {
    @StateObject private var appState = AppState()
    private let nativeBridge = NativeBridge()
    private let productionUrl = URL(string: "https://romanchuk82-ctrl.github.io/personal-safety-agent/")!
    
    public init() {}
    
    public var body: some View {
        ZStack {
            Color(red: 0.05, green: 0.07, blue: 0.12) // Matches tactical dark theme
                .ignoresSafeArea()
            
            WebViewContainer(nativeBridge: nativeBridge, targetUrl: productionUrl)
                .ignoresSafeArea(edges: .bottom)
        }
        .onAppear {
            // Configure backend endpoint
            if let backendUrl = URL(string: "https://personal-safety-backend.onrender.com") {
                LocationEngine.shared.configureBackend(url: backendUrl)
            }
        }
    }
}

class AppState: ObservableObject {
    @Published var isProtectionActive: Bool = false
}
