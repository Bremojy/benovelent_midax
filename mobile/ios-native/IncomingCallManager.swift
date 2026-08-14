import Foundation
import CallKit
import AVFoundation

/// V2 iOS CallKit building block.
/// Connect this class to the Capacitor/native bridge when the web app is
/// packaged as an iOS application.
final class IncomingCallManager: NSObject, CXProviderDelegate {
    private let provider: CXProvider
    private let callController = CXCallController()

    override init() {
        let configuration = CXProviderConfiguration(localizedName: "Benevolent MIDAX")
        configuration.supportsVideo = true
        configuration.maximumCallsPerCallGroup = 1
        configuration.maximumCallGroups = 1
        configuration.iconTemplateImageData = nil
        provider = CXProvider(configuration: configuration)
        super.init()
        provider.setDelegate(self, queue: nil)
    }

    func reportIncomingCall(callId: UUID, callerName: String, hasVideo: Bool, completion: @escaping (Error?) -> Void) {
        let update = CXCallUpdate()
        update.remoteHandle = CXHandle(type: .generic, value: callerName)
        update.localizedCallerName = callerName
        update.hasVideo = hasVideo
        update.supportsHolding = false
        update.supportsGrouping = false
        provider.reportNewIncomingCall(with: callId, update: update, completion: completion)
    }

    func end(callId: UUID) {
        provider.reportCall(with: callId, endedAt: Date(), reason: .remoteEnded)
    }

    func providerDidReset(_ provider: CXProvider) {}
    func provider(_ provider: CXProvider, perform action: CXAnswerCallAction) { action.fulfill() }
    func provider(_ provider: CXProvider, perform action: CXEndCallAction) { action.fulfill() }
    func provider(_ provider: CXProvider, perform action: CXSetHeldCallAction) { action.fulfill() }
    func provider(_ provider: CXProvider, perform action: CXSetMutedCallAction) { action.fulfill() }
    func provider(_ provider: CXProvider, perform action: CXSetGroupCallAction) { action.fulfill() }
    func provider(_ provider: CXProvider, timedOutPerforming action: CXAction) { action.fail() }
    func provider(_ provider: CXProvider, perform action: CXStartCallAction) { action.fulfill() }
}
