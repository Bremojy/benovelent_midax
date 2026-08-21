import { useEffect, useRef, useState } from "react";
import { Camera, CameraOff, Mic, MicOff, Phone, PhoneOff, Video, VideoOff } from "lucide-react";
import { startCallTone } from "../../utils/callTone";
import { stopNativeIncomingCall } from "../../utils/nativeCallBridge";
import "./CallOverlay.css";

const ICE_SERVERS = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
];
const RING_TIMEOUT_SECONDS = 35;

export default function CallOverlay({
  socket,
  currentUser,
  partner,
  callType,
  incomingCall,
  conversationId = "",
  autoAccept = false,
  onClose,
}) {
  const [status, setStatus] = useState(incomingCall ? "Incoming call" : "Calling...");
  const [callId, setCallId] = useState(incomingCall?.callId || "");
  const [connected, setConnected] = useState(false);
  const [muted, setMuted] = useState(false);
  const [activeCallType, setActiveCallType] = useState(callType === "video" ? "video" : "audio");
  const [cameraOff, setCameraOff] = useState(callType !== "video");
  const [error, setError] = useState("");
  const [accepted, setAccepted] = useState(!incomingCall || autoAccept);
  const [duration, setDuration] = useState(0);
  const [ringSecondsLeft, setRingSecondsLeft] = useState(RING_TIMEOUT_SECONDS);
  const peerRef = useRef(null);
  const localStreamRef = useRef(null);
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const remoteAudioRef = useRef(null);
  const videoTransceiverRef = useRef(null);
  const pendingCandidatesRef = useRef([]);
  const timerRef = useRef(null);
  const ringTimerRef = useRef(null);
  const callStartedAtRef = useRef(null);
  const ringtoneRef = useRef(null);
  const mountedRef = useRef(true);
  const renegotiatingRef = useRef(false);

  const me = String(currentUser?.chatId || currentUser?._id || currentUser?.id || "");
  const partnerId = String(partner?._id || partner?.id || incomingCall?.callerUserId || "");
  const selfCall = Boolean(me && partnerId && me === partnerId);
  const isVideo = activeCallType === "video";
  const callConversationId = String(conversationId || incomingCall?.conversationId || "");

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  useEffect(() => {
    if (selfCall) {
      setError("Calling yourself is not available.");
      onClose?.();
      return undefined;
    }
    if (incomingCall && !accepted) ringtoneRef.current = startCallTone();
    return () => {
      ringtoneRef.current?.stop?.();
      ringtoneRef.current = null;
    };
  }, [incomingCall, accepted, selfCall, onClose]);

  useEffect(() => {
    if (connected) return undefined;
    const started = Date.now();
    setRingSecondsLeft(RING_TIMEOUT_SECONDS);
    ringTimerRef.current = window.setInterval(() => {
      const elapsed = Math.floor((Date.now() - started) / 1000);
      const left = Math.max(0, RING_TIMEOUT_SECONDS - elapsed);
      setRingSecondsLeft(left);
      if (left <= 0) {
        clearInterval(ringTimerRef.current);
        if (incomingCall && !accepted) rejectCall("timeout");
        else finish(true);
      }
    }, 1000);
    return () => window.clearInterval(ringTimerRef.current);
  }, [incomingCall, accepted, connected]);

  useEffect(() => {
    if (connected) {
      callStartedAtRef.current = callStartedAtRef.current || Date.now();
      timerRef.current = window.setInterval(() => {
        const start = callStartedAtRef.current || Date.now();
        setDuration(Math.max(0, Math.floor((Date.now() - start) / 1000)));
      }, 1000);
    }
    return () => window.clearInterval(timerRef.current);
  }, [connected]);

  useEffect(() => {
    if (!accepted) return undefined;
    let cancelled = false;
    startCall().catch((err) => {
      if (!cancelled) setError(err.message || "Camera or microphone access failed.");
    });
    return () => { cancelled = true; };
  }, [accepted]);

  useEffect(() => {
    if (!socket) return undefined;

    const handleStarted = ({ callId: startedCallId }) => {
      if (startedCallId) setCallId(String(startedCallId));
    };
    const handleAnswered = async ({ answer }) => {
      if (!peerRef.current || !answer) return;
      try {
        await peerRef.current.setRemoteDescription(new RTCSessionDescription(answer));
        await flushCandidates();
      } catch (err) {
        setError(err.message || "Could not establish the call.");
      }
    };
    const handleOffer = async ({ offer, callId: incomingCallId, mode }) => {
      if (!offer || !peerRef.current) return;
      try {
        await peerRef.current.setRemoteDescription(new RTCSessionDescription(offer));
        if (mode === "video" || mode === "audio") {
          setActiveCallType(mode);
          setCameraOff(mode !== "video");
        }
        await flushCandidates();
        const answer = await peerRef.current.createAnswer();
        await peerRef.current.setLocalDescription(answer);
        socket.emit("call-mode-answer", { to: partnerId, answer, callId: incomingCallId || callId });
      } catch (err) {
        setError(err.message || "Could not switch the call mode.");
      }
    };
    const handleModeAnswer = async ({ answer }) => {
      if (!peerRef.current || !answer) return;
      try {
        await peerRef.current.setRemoteDescription(new RTCSessionDescription(answer));
        renegotiatingRef.current = false;
      } catch (err) {
        renegotiatingRef.current = false;
        setError(err.message || "Could not finish the call mode change.");
      }
    };
    const handleCandidate = async ({ candidate }) => {
      if (!candidate) return;
      if (!peerRef.current?.remoteDescription) {
        pendingCandidatesRef.current.push(candidate);
        return;
      }
      try {
        await peerRef.current.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (err) {
        console.warn("ICE candidate error", err);
      }
    };
    const handleEnded = () => finish(false);
    const handleRejected = () => finish(false);

    socket.on("call-started", handleStarted);
    socket.on("call-answered", handleAnswered);
    socket.on("call-mode-offer", handleOffer);
    socket.on("call-mode-answer", handleModeAnswer);
    socket.on("ice-candidate", handleCandidate);
    socket.on("call-ended", handleEnded);
    socket.on("call-rejected", handleRejected);

    return () => {
      socket.off("call-started", handleStarted);
      socket.off("call-answered", handleAnswered);
      socket.off("call-mode-offer", handleOffer);
      socket.off("call-mode-answer", handleModeAnswer);
      socket.off("ice-candidate", handleCandidate);
      socket.off("call-ended", handleEnded);
      socket.off("call-rejected", handleRejected);
    };
  }, [socket, partnerId, callId]);

  async function createPeer() {
    const peer = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    peerRef.current = peer;
    videoTransceiverRef.current = peer.addTransceiver("video", { direction: "recvonly" });
    peer.onicecandidate = (event) => {
      if (event.candidate && partnerId) {
        socket?.emit("ice-candidate", { to: incomingCall?.from || partnerId, candidate: event.candidate, callId });
      }
    };
    peer.ontrack = (event) => {
      const stream = event.streams?.[0];
      if (!stream) return;
      if (remoteVideoRef.current) remoteVideoRef.current.srcObject = stream;
      if (remoteAudioRef.current) remoteAudioRef.current.srcObject = stream;
    };
    peer.onconnectionstatechange = () => {
      const state = peer.connectionState;
      if (state === "connected") {
        setConnected(true);
        setStatus("Connected");
        ringtoneRef.current?.stop?.();
        stopNativeIncomingCall(callId || incomingCall?.callId || "");
      } else if (["failed", "closed"].includes(state)) {
        setConnected(false);
        if (state === "failed") setError("The call connection failed. Check your internet connection.");
      }
    };
    return peer;
  }

  async function getMedia(type = activeCallType) {
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error("Your browser does not support camera and microphone calls.");
    }
    return navigator.mediaDevices.getUserMedia({
      audio: true,
      video: type === "video" ? { facingMode: "user" } : false,
    });
  }

  async function startCall() {
    if (selfCall || !socket || !partnerId || !accepted || peerRef.current) return;
    const stream = await getMedia(activeCallType);
    localStreamRef.current = stream;
    if (localVideoRef.current) localVideoRef.current.srcObject = stream;

    const peer = await createPeer();
    const audioTrack = stream.getAudioTracks()[0];
    if (audioTrack) {
      peer.addTransceiver("audio", { direction: "sendrecv" }).sender.replaceTrack(audioTrack);
    }
    const videoTrack = stream.getVideoTracks()[0];
    if (videoTrack && videoTransceiverRef.current) {
      await videoTransceiverRef.current.sender.replaceTrack(videoTrack);
      videoTransceiverRef.current.direction = "sendrecv";
      setCameraOff(false);
    }

    if (incomingCall) {
      await peer.setRemoteDescription(new RTCSessionDescription(incomingCall.offer));
      await flushCandidates();
      const answer = await peer.createAnswer();
      await peer.setLocalDescription(answer);
      socket.emit("call-answer", { to: incomingCall.from, answer, callId: incomingCall.callId || callId });
      setStatus("Connecting...");
    } else {
      const offer = await peer.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: true });
      await peer.setLocalDescription(offer);
      socket.emit("call-user", {
        to: partnerId,
        conversationId: callConversationId,
        callType: activeCallType,
        callerUserId: me,
        callerName: currentUser?.fullName || currentUser?.name || "Member",
        callerRole: currentUser?.role || "member",
        offer,
      });
    }
  }

  async function flushCandidates() {
    if (!peerRef.current?.remoteDescription) return;
    const candidates = pendingCandidatesRef.current.splice(0);
    for (const candidate of candidates) {
      try { await peerRef.current.addIceCandidate(new RTCIceCandidate(candidate)); }
      catch (err) { console.warn("Queued ICE candidate error", err); }
    }
  }

  async function toggleCallMode() {
    if (!peerRef.current || !socket || !partnerId || !connected || renegotiatingRef.current) return;
    renegotiatingRef.current = true;
    const nextType = activeCallType === "video" ? "audio" : "video";
    try {
      if (nextType === "video") {
        const videoStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" }, audio: false });
        const videoTrack = videoStream.getVideoTracks()[0];
        if (!videoTrack || !videoTransceiverRef.current) throw new Error("Camera could not be started.");
        localStreamRef.current?.getVideoTracks().forEach((track) => track.stop());
        localStreamRef.current?.addTrack(videoTrack);
        await videoTransceiverRef.current.sender.replaceTrack(videoTrack);
        videoTransceiverRef.current.direction = "sendrecv";
        if (localVideoRef.current) localVideoRef.current.srcObject = localStreamRef.current;
        setCameraOff(false);
      } else {
        await videoTransceiverRef.current?.sender.replaceTrack(null);
        if (videoTransceiverRef.current) videoTransceiverRef.current.direction = "recvonly";
        localStreamRef.current?.getVideoTracks().forEach((track) => track.stop());
        localStreamRef.current?.getTracks().filter((track) => track.kind === "video").forEach((track) => localStreamRef.current.removeTrack(track));
        setCameraOff(true);
      }
      setActiveCallType(nextType);
      const offer = await peerRef.current.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: true });
      await peerRef.current.setLocalDescription(offer);
      socket.emit("call-mode-offer", { to: incomingCall?.from || partnerId, offer, callId, mode: nextType });
    } catch (err) {
      setError(err.message || "Could not change the call mode.");
      renegotiatingRef.current = false;
    }
  }

  function toggleMute() {
    const next = !muted;
    localStreamRef.current?.getAudioTracks().forEach((track) => { track.enabled = !next; });
    setMuted(next);
  }

  function toggleCamera() {
    const next = !cameraOff;
    localStreamRef.current?.getVideoTracks().forEach((track) => { track.enabled = !next; });
    setCameraOff(next);
  }

  function rejectCall(reason = "declined") {
    const target = incomingCall?.from || partnerId;
    socket?.emit("call-rejected", { to: target, callId: incomingCall?.callId || callId, reason });
    stopNativeIncomingCall(incomingCall?.callId || callId);
    ringtoneRef.current?.stop?.();
    cleanupMedia();
    onClose?.();
  }

  function finish(notify = true) {
    const target = incomingCall?.from || partnerId;
    if (notify && target) socket?.emit("end-call", { to: target, callId: incomingCall?.callId || callId });
    ringtoneRef.current?.stop?.();
    stopNativeIncomingCall(incomingCall?.callId || callId);
    cleanupMedia();
    onClose?.();
  }

  function cleanupMedia() {
    window.clearInterval(timerRef.current);
    window.clearInterval(ringTimerRef.current);
    peerRef.current?.close();
    peerRef.current = null;
    videoTransceiverRef.current = null;
    localStreamRef.current?.getTracks().forEach((track) => track.stop());
    localStreamRef.current = null;
    if (localVideoRef.current) localVideoRef.current.srcObject = null;
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
    if (remoteAudioRef.current) remoteAudioRef.current.srcObject = null;
  }

  const mins = String(Math.floor(duration / 60)).padStart(2, "0");
  const secs = String(duration % 60).padStart(2, "0");
  const displayDuration = `${mins}:${secs}`;

  return (
    <div className="call-overlay" role="dialog" aria-modal="true" aria-label={`${isVideo ? "Video" : "Audio"} call`}>
      <div className="call-card">
        <div className="call-card-header">
          <div>
            <span className="call-kicker">{isVideo ? "VIDEO CALL" : "AUDIO CALL"}</span>
            <h2>{partner?.fullName || incomingCall?.callerName || "Member"}</h2>
            <p>
              {connected ? displayDuration : incomingCall && !accepted ? `${status} • ${ringSecondsLeft}s` : status}
            </p>
          </div>
          <span className={`call-status-dot ${connected ? "connected" : ""}`} />
        </div>
        {error && <div className="call-error" role="alert">{error}</div>}

        {isVideo ? (
          <div className="call-videos">
            <video ref={remoteVideoRef} className="remote-call-video" autoPlay playsInline />
            <video ref={localVideoRef} className="local-call-video" autoPlay muted playsInline />
            {!connected && <div className="call-video-placeholder">{incomingCall && !accepted ? "Answer to start the call" : status}</div>}
          </div>
        ) : (
          <div className="audio-call-center">
            <div className="audio-call-avatar"><img src={partner?.profileImage || incomingCall?.callerProfileImage || "/default-avatar.svg"} alt={partner?.fullName || "Member"} /></div>
            <h3>{partner?.fullName || incomingCall?.callerName || "Member"}</h3>
            <p>{connected ? `Connected • ${displayDuration}` : status}</p>
            <audio ref={remoteAudioRef} autoPlay playsInline />
          </div>
        )}

        <div className="call-controls">
          {incomingCall && !accepted && (
            <>
              <button type="button" className="call-control accept" onClick={() => {
                ringtoneRef.current?.stop?.();
                stopNativeIncomingCall(incomingCall?.callId || callId);
                setAccepted(true);
              }}>
                <Phone size={18} />Accept
              </button>
              <button type="button" className="call-control decline" onClick={() => rejectCall("declined")}>
                <PhoneOff size={18} />Decline
              </button>
            </>
          )}
          {accepted && (
            <>
              <button type="button" className="call-control" onClick={toggleMute}>
                {muted ? <MicOff size={18} /> : <Mic size={18} />}{muted ? "Unmute" : "Mute"}
              </button>
              <button type="button" className="call-control" onClick={toggleCallMode} disabled={!connected} title={connected ? `Switch to ${isVideo ? "audio" : "video"}` : "Connect first"}>
                {isVideo ? <CameraOff size={18} /> : <Camera size={18} />}
                {isVideo ? "Audio mode" : "Video mode"}
              </button>
              {isVideo && <button type="button" className="call-control" onClick={toggleCamera}>
                {cameraOff ? <VideoOff size={18} /> : <Video size={18} />}{cameraOff ? "Camera on" : "Camera off"}
              </button>}
              <button type="button" className="call-control decline" onClick={() => finish(true)}><PhoneOff size={18} />End</button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
