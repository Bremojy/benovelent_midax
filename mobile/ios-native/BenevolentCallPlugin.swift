import Foundation
import Capacitor

@objc(BenevolentCallPlugin)
public class BenevolentCallPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "BenevolentCallPlugin"
    public let jsName = "BenevolentCall"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "startIncomingCall", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "stopIncomingCall", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "startVoIP", returnType: CAPPluginReturnPromise),
    ]

    public override func load() {
        IncomingCallManager.shared.start()
        let center = NotificationCenter.default
        center.addObserver(forName: .benevolentCallAnswered, object: nil, queue: .main) { [weak self] note in
            let callId = note.object as? String ?? ""
            guard !callId.isEmpty else { return }
            self?.notifyListeners("callAnswered", data: ["callId": callId])
        }
        center.addObserver(forName: .benevolentCallEnded, object: nil, queue: .main) { [weak self] note in
            let callId = note.object as? String ?? ""
            guard !callId.isEmpty else { return }
            self?.notifyListeners("callEnded", data: ["callId": callId])
        }
    }

    @objc func startIncomingCall(_ call: CAPPluginCall) {
        let backendCallId = call.getString("callId") ?? ""
        let caller = call.getString("callerName") ?? "Benevolent MIDAX"
        let isVideo = call.getString("callType") == "video"
        guard !backendCallId.isEmpty else { call.reject("Missing call ID"); return }
        IncomingCallManager.shared.reportIncomingCall(backendCallId: backendCallId, callerName: caller, hasVideo: isVideo) { error in
            if let error { call.reject("Could not present incoming call", nil, error) }
            else { call.resolve() }
        }
    }

    @objc func stopIncomingCall(_ call: CAPPluginCall) {
        let backendCallId = call.getString("callId") ?? ""
        if !backendCallId.isEmpty { IncomingCallManager.shared.end(backendCallId: backendCallId) }
        call.resolve()
    }

    @objc func startVoIP(_ call: CAPPluginCall) {
        IncomingCallManager.shared.start()
        call.resolve()
    }
}
