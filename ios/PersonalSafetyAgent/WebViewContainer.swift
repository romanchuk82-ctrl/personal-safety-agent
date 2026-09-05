import SwiftUI
import WebKit

public struct WebViewContainer: UIViewRepresentable {
    public let nativeBridge: NativeBridge
    public let targetUrl: URL
    
    public init(nativeBridge: NativeBridge, targetUrl: URL) {
        self.nativeBridge = nativeBridge
        self.targetUrl = targetUrl
    }
    
    public func makeCoordinator() -> Coordinator {
        Coordinator(self)
    }
    
    public func makeUIView(context: Context) -> WKWebView {
        let config = WKWebViewConfiguration()
        config.allowsInlineMediaPlayback = true
        config.mediaTypesRequiringUserActionForPlayback = []
        
        // Inject native indicator script before web page loads
        let userScript = WKUserScript(
            source: """
            window.__PSA_NATIVE_IOS = true;
            console.log('[NativeBridge] Injected window.__PSA_NATIVE_IOS = true');
            """,
            injectionTime: .atDocumentStart,
            forMainFrameOnly: true
        )
        config.userContentController.addUserScript(userScript)
        config.userContentController.add(nativeBridge, name: "psaNative")
        
        let webView = WKWebView(frame: .zero, configuration: config)
        webView.navigationDelegate = context.coordinator
        webView.allowsBackForwardNavigationGestures = true
        webView.customUserAgent = "PersonalSafetyAgent-iOS/1.0"
        
        nativeBridge.webView = webView
        
        let request = URLRequest(url: targetUrl)
        webView.load(request)
        
        return webView
    }
    
    public func updateUIView(_ uiView: WKWebView, context: Context) {}
    
    public class Coordinator: NSObject, WKNavigationDelegate {
        var parent: WebViewContainer
        
        init(_ parent: WebViewContainer) {
            self.parent = parent
        }
        
        public func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
            print("[WebViewContainer] Page loaded: \(webView.url?.absoluteString ?? "")")
            // Send initial native status to web
            parent.nativeBridge.pushStatusToWeb()
        }
        
        public func webView(_ webView: WKWebView, didFail navigation: WKNavigation!, withError error: Error) {
            print("[WebViewContainer] Navigation error: \(error.localizedDescription)")
        }
    }
}
