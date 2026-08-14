function getCapacitorCallPlugin() {
  try {
    return globalThis?.Capacitor?.Plugins?.BenevolentCall || null;
  } catch {
    return null;
  }
}

export function isNativeCallBridgeAvailable() {
  return Boolean(
    (typeof window !== "undefined" && window.BenevolentNativeCall?.startIncomingCall) ||
    getCapacitorCallPlugin()?.startIncomingCall
  );
}

export async function startNativeIncomingCall(payload = {}) {
  const data = {
    callerName: payload.callerName || "Benevolent MIDAX",
    callType: payload.callType === "video" ? "video" : "audio",
    callId: payload.callId || "",
    callerUserId: payload.callerUserId || "",
  };
  try {
    const plugin = getCapacitorCallPlugin();
    if (plugin?.startIncomingCall) {
      await plugin.startIncomingCall(data);
      return true;
    }
    if (typeof window !== "undefined" && window.BenevolentNativeCall?.startIncomingCall) {
      await Promise.resolve(window.BenevolentNativeCall.startIncomingCall(data));
      return true;
    }
  } catch (error) {
    console.warn("Native call bridge failed:", error);
  }
  return false;
}

export async function stopNativeIncomingCall(callId = "") {
  try {
    const plugin = getCapacitorCallPlugin();
    if (plugin?.stopIncomingCall) {
      await plugin.stopIncomingCall({ callId });
      return true;
    }
    if (typeof window !== "undefined" && window.BenevolentNativeCall?.stopIncomingCall) {
      await Promise.resolve(window.BenevolentNativeCall.stopIncomingCall({ callId }));
      return true;
    }
  } catch (error) {
    console.warn("Native call stop bridge failed:", error);
  }
  return false;
}
