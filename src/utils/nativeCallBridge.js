export function isNativeCallBridgeAvailable() {
  return typeof window !== "undefined" && Boolean(window.BenevolentNativeCall?.startIncomingCall);
}

export function startNativeIncomingCall(payload = {}) {
  if (!isNativeCallBridgeAvailable()) return false;
  try {
    window.BenevolentNativeCall.startIncomingCall({
      callerName: payload.callerName || "Benevolent MIDAX",
      callType: payload.callType === "video" ? "video" : "audio",
      callId: payload.callId || "",
      callerUserId: payload.callerUserId || "",
    });
    return true;
  } catch (error) {
    console.warn("Native call bridge failed:", error);
    return false;
  }
}

export function stopNativeIncomingCall() {
  if (typeof window === "undefined" || !window.BenevolentNativeCall?.stopIncomingCall) return false;
  try {
    window.BenevolentNativeCall.stopIncomingCall();
    return true;
  } catch (error) {
    console.warn("Native call stop bridge failed:", error);
    return false;
  }
}
