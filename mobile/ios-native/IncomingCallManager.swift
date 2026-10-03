import Foundation
import CallKit
import AVFoundation
import PushKit
import UIKit

/// Native iOS incoming-call pipeline for the packaged Benevolent MIDAX app.
/// PushKit delivers a VoIP wake event while the app is suspended/closed; CallKit
/// then owns the system incoming-call UI and ringtone policy.
final class IncomingCallManager: NSObject, CXProviderDelegate, PKPushRegistryDelegate {
    static let shared = IncomingCallManager()

    private let provider: CXProvider
    private let callController = CXCallController()
    private let pushRegistry: PKPushRegistry
    // Maps the system CallKit UUID to the authoritative backend callId.
    // Backend call IDs are not required to be UUID strings.
    private var pendingCalls: [UUID: String] = [:]

    private override init() {
        let configuration = CXProviderConfiguration(localizedName: "Benevolent MIDAX")
        configuration.supportsVideo = true
        configuration.maximumCallsPerCallGroup = 1
        configuration.maximumCallGroups = 1
        if #available(iOS 14.0, *) { configuration.includesCallsInRecents = true }
        provider = CXProvider(configuration: configuration)
        pushRegistry = PKPushRegistry(queue: .main)
        super.init()
        provider.setDelegate(self, queue: .main)
        pushRegistry.delegate = self
        pushRegistry.desiredPushTypes = [.voIP]
    }

    func start() {
        pushRegistry.desiredPushTypes = [.voIP]
    }

    func reportIncomingCall(backendCallId: String, callerName: String, hasVideo: Bool, completion: @escaping (Error?) -> Void) {
        if pendingCalls.values.contains(backendCallId) {
            completion(nil)
            return
        }
        let callUUID = UUID()
        let update = CXCallUpdate()
        update.remoteHandle = CXHandle(type: .generic, value: callerName)
        update.localizedCallerName = callerName
        update.hasVideo = hasVideo
        update.supportsHolding = false
        update.supportsGrouping = false
        pendingCalls[callUUID] = backendCallId
        provider.reportNewIncomingCall(with: callUUID, update: update, completion: completion)
    }

    func end(backendCallId: String, reason: CXCallEndedReason = .remoteEnded) {
        guard let callUUID = pendingCalls.first(where: { $0.value == backendCallId })?.key else { return }
        provider.reportCall(with: callUUID, endedAt: Date(), reason: reason)
        pendingCalls.removeValue(forKey: callUUID)
    }

    // MARK: PushKit
    func pushRegistry(_ registry: PKPushRegistry, didUpdate pushCredentials: PKPushCredentials, for type: PKPushType) {
        let token = pushCredentials.token.map { String(format: "%02x", $0) }.joined()
        NotificationCenter.default.post(name: .benevolentVoipToken, object: token)
    }

    func pushRegistry(_ registry: PKPushRegistry, didReceiveIncomingPushWith payload: PKPushPayload, for type: PKPushType, completion: @escaping () -> Void) {
        let data = payload.dictionaryPayload
        let backendCallId = String(data["callId"] as? String ?? "")
        let callerName = (data["callerName"] as? String) ?? "Benevolent MIDAX"
        let callType = (data["callType"] as? String) ?? "audio"
        guard !backendCallId.isEmpty else { completion(); return }
        reportIncomingCall(backendCallId: backendCallId, callerName: callerName, hasVideo: callType == "video") { _ in completion() }
    }

    // MARK: CallKit
    func providerDidReset(_ provider: CXProvider) { pendingCalls.removeAll() }
    func provider(_ provider: CXProvider, perform action: CXAnswerCallAction) {
        let backendCallId = pendingCalls[action.callUUID] ?? action.callUUID.uuidString
        pendingCalls.removeValue(forKey: action.callUUID)
        NotificationCenter.default.post(name: .benevolentCallAnswered, object: backendCallId)
        action.fulfill()
    }
    func provider(_ provider: CXProvider, perform action: CXEndCallAction) {
        let backendCallId = pendingCalls[action.callUUID] ?? action.callUUID.uuidString
        NotificationCenter.default.post(name: .benevolentCallEnded, object: backendCallId)
        pendingCalls.removeValue(forKey: action.callUUID)
        action.fulfill()
    }
    func provider(_ provider: CXProvider, perform action: CXSetHeldCallAction) { action.fulfill() }
    func provider(_ provider: CXProvider, perform action: CXSetMutedCallAction) { action.fulfill() }
    func provider(_ provider: CXProvider, perform action: CXSetGroupCallAction) { action.fulfill() }
    func provider(_ provider: CXProvider, timedOutPerforming action: CXAction) { action.fail() }
    func provider(_ provider: CXProvider, didActivate audioSession: AVAudioSession) {
        try? AVAudioSession.sharedInstance().setCategory(.playAndRecord, mode: .voiceChat, options: [.allowBluetooth, .defaultToSpeaker])
        try? AVAudioSession.sharedInstance().setActive(true)
    }
    func provider(_ provider: CXProvider, didDeactivate audioSession: AVAudioSession) {
        try? AVAudioSession.sharedInstance().setActive(false)
    }
}

extension Notification.Name {
    static let benevolentVoipToken = Notification.Name("BenevolentVoIPToken")
    static let benevolentCallAnswered = Notification.Name("BenevolentCallAnswered")
    static let benevolentCallEnded = Notification.Name("BenevolentCallEnded")
}
