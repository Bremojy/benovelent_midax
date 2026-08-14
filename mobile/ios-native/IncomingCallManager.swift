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

    func reportIncomingCall(callId: UUID, callerName: String, hasVideo: Bool, completion: @escaping (Error?) -> Void) {
        let update = CXCallUpdate()
        update.remoteHandle = CXHandle(type: .generic, value: callerName)
        update.localizedCallerName = callerName
        update.hasVideo = hasVideo
        update.supportsHolding = false
        update.supportsGrouping = false
        pendingCalls[callId] = callerName
        provider.reportNewIncomingCall(with: callId, update: update, completion: completion)
    }

    func end(callId: UUID, reason: CXCallEndedReason = .remoteEnded) {
        provider.reportCall(with: callId, endedAt: Date(), reason: reason)
        pendingCalls.removeValue(forKey: callId)
    }

    // MARK: PushKit
    func pushRegistry(_ registry: PKPushRegistry, didUpdate pushCredentials: PKPushCredentials, for type: PKPushType) {
        let token = pushCredentials.token.map { String(format: "%02x", $0) }.joined()
        NotificationCenter.default.post(name: .benevolentVoipToken, object: token)
    }

    func pushRegistry(_ registry: PKPushRegistry, didReceiveIncomingPushWith payload: PKPushPayload, for type: PKPushType, completion: @escaping () -> Void) {
        let data = payload.dictionaryPayload
        let callId = UUID(uuidString: String(data["callId"] as? String ?? "")) ?? UUID()
        let callerName = (data["callerName"] as? String) ?? "Benevolent MIDAX"
        let callType = (data["callType"] as? String) ?? "audio"
        reportIncomingCall(callId: callId, callerName: callerName, hasVideo: callType == "video") { _ in completion() }
    }

    // MARK: CallKit
    func providerDidReset(_ provider: CXProvider) { pendingCalls.removeAll() }
    func provider(_ provider: CXProvider, perform action: CXAnswerCallAction) {
        NotificationCenter.default.post(name: .benevolentCallAnswered, object: action.callUUID)
        action.fulfill()
    }
    func provider(_ provider: CXProvider, perform action: CXEndCallAction) {
        NotificationCenter.default.post(name: .benevolentCallEnded, object: action.callUUID)
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
