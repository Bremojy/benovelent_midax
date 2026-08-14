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
    }

    @objc func startIncomingCall(_ call: CAPPluginCall) {
        let uuid = UUID(uuidString: call.getString("callId") ?? "") ?? UUID()
        let caller = call.getString("callerName") ?? "Benevolent MIDAX"
        let isVideo = call.getString("callType") == "video"
        IncomingCallManager.shared.reportIncomingCall(callId: uuid, callerName: caller, hasVideo: isVideo) { error in
            if let error { call.reject("Could not present incoming call", nil, error) }
            else { call.resolve() }
        }
    }

    @objc func stopIncomingCall(_ call: CAPPluginCall) {
        let uuid = UUID(uuidString: call.getString("callId") ?? "")
        if let uuid { IncomingCallManager.shared.end(callId: uuid) }
        call.resolve()
    }

    @objc func startVoIP(_ call: CAPPluginCall) {
        IncomingCallManager.shared.start()
        call.resolve()
    }
}
