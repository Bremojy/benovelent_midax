import { useEffect, useRef, useState } from "react";
import { Camera, CameraOff, Mic, MicOff, Phone, PhoneOff, Video, VideoOff } from "lucide-react";
import { startCallTone } from "../../utils/callTone";
import { stopNativeIncomingCall } from "../../utils/nativeCallBridge";
import API from "../../services/api";
import "./CallOverlay.css";

const DEFAULT_ICE_SERVERS = [
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
  const callIdRef = useRef(incomingCall?.callId || "");
  const endingRef = useRef(false);
  const [connected, setConnected] = useState(false);
  const [muted, setMuted] = useState(false);
  const [activeCallType, setActiveCallType] = useState(callType === "video" ? "video" : "audio");
  const [cameraOff, setCameraOff] = useState(callType !== "video");
  const [error, setError] = useState("");
  const [audioPlaybackBlocked, setAudioPlaybackBlocked] = useState(false);
  const [accepted, setAccepted] = useState(!incomingCall || autoAccept);
  const [duration, setDuration] = useState(0);
  const [ringSecondsLeft, setRingSecondsLeft] = useState(RING_TIMEOUT_SECONDS);
  const peerRef = useRef(null);
  const localStreamRef = useRef(null);
  const remoteStreamRef = useRef(null);
  const remoteMediaReadyRef = useRef(false);
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const remoteAudioRef = useRef(null);
  const videoTransceiverRef = useRef(null);
  const pendingCandidatesRef = useRef([]);
  const pendingOutgoingCandidatesRef = useRef([]);
  const timerRef = useRef(null);
  const ringTimerRef = useRef(null);
  const callStartedAtRef = useRef(null);
  const ringtoneRef = useRef(null);
  const mountedRef = useRef(true);
  const renegotiatingRef = useRef(false);
  const iceRestartInFlightRef = useRef(false);
  const recoveryDeadlineRef = useRef(null);
  const connectionRecoveryTimerRef = useRef(null);
  const iceServersRef = useRef(DEFAULT_ICE_SERVERS);
  const iceConfigPromiseRef = useRef(null);

  const me = String(currentUser?.chatId || currentUser?._id || currentUser?.id || "");
  const partnerId = String(partner?._id || partner?.id || incomingCall?.callerUserId || "");
  const selfCall = Boolean(me && partnerId && me === partnerId);
  const isVideo = activeCallType === "video";
  const callConversationId = String(conversationId || incomingCall?.conversationId || "");

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      ringtoneRef.current?.stop?.();
      ringtoneRef.current = null;
      stopNativeIncomingCall(callIdRef.current || callId);
      cleanupMedia();
    };
  }, []);

  useEffect(() => {
    const initialId = String(incomingCall?.callId || "");
    callIdRef.current = initialId;
    setCallId(initialId);
    endingRef.current = false;
  }, [incomingCall?.callId]);

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
      if (!cancelled) {
        setError(err.message || "Camera or microphone access failed.");
        if (incomingCall) rejectCall("media_error");
      }
    });
    return () => { cancelled = true; };
  }, [accepted]);

  useEffect(() => {
    if (!socket) return undefined;

    const handleStarted = ({ callId: startedCallId }) => {
      if (startedCallId) {
        const normalized = String(startedCallId);
        callIdRef.current = normalized;
        setCallId(normalized);
        flushOutgoingCandidates(normalized);
      }
    };
    const handleAnswered = async ({ answer, callId: answeredCallId }) => {
      if (!peerRef.current || !answer) return;
      const activeId = String(callIdRef.current || callId || incomingCall?.callId || "");
      if (answeredCallId && activeId && String(answeredCallId) !== activeId) return;
      try {
        await peerRef.current.setRemoteDescription(new RTCSessionDescription(answer));
        await flushCandidates();
      } catch (err) {
        setError(err.message || "Could not establish the call.");
      }
    };
    const handleOffer = async ({ offer, callId: incomingCallId, mode }) => {
      if (!offer || !peerRef.current) return;
      const activeId = String(callIdRef.current || callId || incomingCall?.callId || "");
      if (incomingCallId && activeId && String(incomingCallId) !== activeId) return;
      try {
        await peerRef.current.setRemoteDescription(new RTCSessionDescription(offer));
        if (mode === "video" || mode === "audio") {
          setActiveCallType(mode);
          if (mode === "video") await applyLocalVideoMode(true);
          else await applyLocalVideoMode(false);
        }
        await flushCandidates();
        const answer = await peerRef.current.createAnswer();
        await peerRef.current.setLocalDescription(answer);
        socket.emit("call-mode-answer", {
          to: incomingCall?.from || partnerId,
          answer,
          callId: incomingCallId || callId,
          mode: mode === "video" ? "video" : "audio",
        });
      } catch (err) {
        setError(err.message || "Could not switch the call mode.");
      }
    };
    const handleModeAnswer = async ({ answer, callId: answerCallId, mode }) => {
      if (!peerRef.current || !answer) return;
      const activeId = String(callIdRef.current || callId || incomingCall?.callId || "");
      if (answerCallId && activeId && String(answerCallId) !== activeId) return;
      try {
        await peerRef.current.setRemoteDescription(new RTCSessionDescription(answer));
        if (mode === "video" || mode === "audio") {
          setActiveCallType(mode);
          setCameraOff(mode !== "video");
        }
        await flushCandidates();
        renegotiatingRef.current = false;
      } catch (err) {
        renegotiatingRef.current = false;
        setError(err.message || "Could not finish the call mode change.");
      }
    };
    const handleCandidate = async ({ candidate, callId: candidateCallId }) => {
      if (!candidate) return;
      const activeId = String(callIdRef.current || callId || incomingCall?.callId || "");
      if (candidateCallId && activeId && String(candidateCallId) !== activeId) return;
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
    const handleSocketDisconnect = () => {
      if (!endingRef.current) setError("The realtime call connection was interrupted. Reconnecting…");
    };

    socket.on("call-started", handleStarted);
    socket.on("call-answered", handleAnswered);
    socket.on("call-mode-offer", handleOffer);
    socket.on("call-mode-answer", handleModeAnswer);
    socket.on("ice-candidate", handleCandidate);
    socket.on("call-ended", handleEnded);
    socket.on("call-rejected", handleRejected);
    socket.on("disconnect", handleSocketDisconnect);

    return () => {
      socket.off("call-started", handleStarted);
      socket.off("call-answered", handleAnswered);
      socket.off("call-mode-offer", handleOffer);
      socket.off("call-mode-answer", handleModeAnswer);
      socket.off("ice-candidate", handleCandidate);
      socket.off("call-ended", handleEnded);
      socket.off("call-rejected", handleRejected);
      socket.off("disconnect", handleSocketDisconnect);
    };
  }, [socket, partnerId]);

  async function loadIceServers() {
    if (iceConfigPromiseRef.current) return iceConfigPromiseRef.current;
    iceConfigPromiseRef.current = API.get("/auth/webrtc-config")
      .then((response) => {
        const configured = Array.isArray(response?.data?.iceServers)
          ? response.data.iceServers.filter((server) => server && server.urls)
          : [];
        if (configured.length) iceServersRef.current = configured;
        return iceServersRef.current;
      })
      .catch(() => iceServersRef.current);
    return iceConfigPromiseRef.current;
  }

  async function createPeer() {
    const peer = new RTCPeerConnection({ iceServers: iceServersRef.current });
    peerRef.current = peer;
    videoTransceiverRef.current = peer.addTransceiver("video", { direction: "recvonly" });
    peer.onicecandidate = (event) => {
      if (!event.candidate) return;
      const target = incomingCall?.from || partnerId;
      const activeId = String(callIdRef.current || incomingCall?.callId || callId || "");
      if (!target) return;
      if (!activeId) {
        pendingOutgoingCandidatesRef.current.push(event.candidate);
        return;
      }
      socket?.emit("ice-candidate", { to: target, candidate: event.candidate, callId: activeId });
    };
    peer.ontrack = (event) => {
      if (!event.track) return;
      let stream = event.streams?.[0] || remoteStreamRef.current;
      if (!stream && typeof MediaStream !== "undefined") stream = new MediaStream();
      if (!stream) return;
      remoteStreamRef.current = stream;
      const hasTrack = stream.getTracks().some((track) => track === event.track || track.id === event.track.id);
      if (!hasTrack) stream.addTrack(event.track);
      remoteMediaReadyRef.current = true;
      if (remoteVideoRef.current) remoteVideoRef.current.srcObject = stream;
      if (remoteAudioRef.current) {
        remoteAudioRef.current.srcObject = stream;
        void ensureRemoteAudioPlayback();
      }
      if (peer.connectionState === "connected") {
        setConnected(true);
        setStatus("Connected");
        ringtoneRef.current?.stop?.();
        stopNativeIncomingCall(callIdRef.current || incomingCall?.callId || "");
      }
    };
    peer.oniceconnectionstatechange = () => {
      if (endingRef.current || peerRef.current !== peer) return;
      if (peer.iceConnectionState === "connected" || peer.iceConnectionState === "completed") {
        window.clearTimeout(connectionRecoveryTimerRef.current);
        connectionRecoveryTimerRef.current = null;
        window.clearTimeout(recoveryDeadlineRef.current);
        recoveryDeadlineRef.current = null;
        setStatus("Connected");
        return;
      }
      if (peer.iceConnectionState === "disconnected" || peer.iceConnectionState === "failed") {
        setStatus("Reconnecting...");
        setError("");
        attemptIceRestart(peer);
      }
    };
    peer.onconnectionstatechange = () => {
      const state = peer.connectionState;
      if (state === "connected" && remoteMediaReadyRef.current) {
        window.clearTimeout(connectionRecoveryTimerRef.current);
        connectionRecoveryTimerRef.current = null;
        window.clearTimeout(recoveryDeadlineRef.current);
        recoveryDeadlineRef.current = null;
        setConnected(true);
        setStatus("Connected");
        ringtoneRef.current?.stop?.();
        stopNativeIncomingCall(callIdRef.current || incomingCall?.callId || "");
      } else if (state === "connected") {
        setStatus("Connecting media...");
      } else if (state === "disconnected" && !endingRef.current) {
        setConnected(false);
        setStatus("Reconnecting...");
      } else if (["failed", "closed"].includes(state)) {
        window.clearTimeout(connectionRecoveryTimerRef.current);
        connectionRecoveryTimerRef.current = null;
        setConnected(false);
        if (state === "failed") setError("The call connection failed. Check your internet connection or TURN settings.");
      }
    };
    return peer;
  }

  async function getMedia(type = activeCallType) {
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error("Your browser does not support camera and microphone calls.");
    }
    if (typeof window !== "undefined" && !window.isSecureContext && !["localhost", "127.0.0.1"].includes(window.location.hostname)) {
      throw new Error("Secure calling requires HTTPS. Open the Benevolent site over HTTPS and allow microphone/camera access.");
    }
    try {
      return await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
        video: type === "video" ? { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } } : false,
      });
    } catch (error) {
      const code = String(error?.name || "");
      if (code === "NotAllowedError" || code === "SecurityError") {
        throw new Error(type === "video"
          ? "Microphone and camera permissions are required for a video call."
          : "Microphone permission is required for an audio call.");
      }
      if (code === "NotFoundError") {
        throw new Error(type === "video" ? "A camera and microphone are required for a video call." : "A microphone is required for an audio call.");
      }
      throw error;
    }
  }

  async function ensureRemoteAudioPlayback() {
    const element = remoteAudioRef.current;
    if (!element) return false;
    element.autoplay = true;
    element.playsInline = true;
    element.muted = false;
    element.volume = 1;
    try {
      await element.play();
      if (mountedRef.current) setAudioPlaybackBlocked(false);
      return true;
    } catch (_) {
      if (mountedRef.current) setAudioPlaybackBlocked(true);
      return false;
    }
  }

  async function attemptIceRestart(peer) {
    if (!peer || endingRef.current || peerRef.current !== peer || !callIdRef.current || !socket || iceRestartInFlightRef.current) return;
    iceRestartInFlightRef.current = true;
    setStatus("Reconnecting...");
    window.clearTimeout(connectionRecoveryTimerRef.current);
    connectionRecoveryTimerRef.current = null;
    try {
      const offer = await peer.createOffer({ iceRestart: true, offerToReceiveAudio: true, offerToReceiveVideo: true });
      await peer.setLocalDescription(offer);
      socket.emit("call-mode-offer", {
        to: incomingCall?.from || partnerId,
        offer,
        callId: callIdRef.current,
        mode: activeCallType === "video" ? "video" : "audio",
      });
      window.clearTimeout(recoveryDeadlineRef.current);
      recoveryDeadlineRef.current = window.setTimeout(() => {
        recoveryDeadlineRef.current = null;
        if (!endingRef.current && peerRef.current === peer && !["connected", "completed"].includes(peer.iceConnectionState)) {
          setError("The call connection could not recover. Please start the call again.");
          finish(false);
        }
      }, 10000);
    } catch (error) {
      setError(error?.message || "The call connection could not be recovered.");
      window.clearTimeout(recoveryDeadlineRef.current);
      recoveryDeadlineRef.current = window.setTimeout(() => {
        recoveryDeadlineRef.current = null;
        if (!endingRef.current && peerRef.current === peer) finish(false);
      }, 5000);
    } finally {
      iceRestartInFlightRef.current = false;
    }
  }

  async function startCall() {
    if (selfCall || !socket || !partnerId || !accepted || peerRef.current) return;
    await loadIceServers();
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
      socket.emit("call-answer", { to: incomingCall.from, answer, callId: incomingCall.callId || callIdRef.current || callId });
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


  function flushOutgoingCandidates(activeId) {
    const normalizedId = String(activeId || "").trim();
    const target = incomingCall?.from || partnerId;
    if (!normalizedId || !target || !socket) return;
    const candidates = pendingOutgoingCandidatesRef.current.splice(0);
    candidates.forEach((candidate) => {
      socket.emit("ice-candidate", {
        to: target,
        candidate,
        callId: normalizedId,
      });
    });
  }

  async function flushCandidates() {
    if (!peerRef.current?.remoteDescription) return;
    const candidates = pendingCandidatesRef.current.splice(0);
    for (const candidate of candidates) {
      try { await peerRef.current.addIceCandidate(new RTCIceCandidate(candidate)); }
      catch (err) { console.warn("Queued ICE candidate error", err); }
    }
  }

  async function applyLocalVideoMode(enabled) {
    const videoTransceiver = videoTransceiverRef.current;
    if (!videoTransceiver) throw new Error("The call video channel is not ready yet.");

    if (!enabled) {
      await videoTransceiver.sender.replaceTrack(null);
      videoTransceiver.direction = "recvonly";
      localStreamRef.current?.getVideoTracks().forEach((track) => track.stop());
      localStreamRef.current?.getTracks()
        .filter((track) => track.kind === "video")
        .forEach((track) => localStreamRef.current?.removeTrack?.(track));
      if (localVideoRef.current) localVideoRef.current.srcObject = localStreamRef.current;
      setCameraOff(true);
      return;
    }

    const currentVideoTrack = localStreamRef.current?.getVideoTracks?.()[0];
    let videoTrack = currentVideoTrack;
    if (!videoTrack) {
      const videoStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      videoTrack = videoStream.getVideoTracks()[0];
      if (!videoTrack) throw new Error("Camera could not be started.");
      localStreamRef.current?.addTrack(videoTrack);
    }
    await videoTransceiver.sender.replaceTrack(videoTrack);
    videoTransceiver.direction = "sendrecv";
    if (localVideoRef.current) localVideoRef.current.srcObject = localStreamRef.current;
    setCameraOff(false);
  }

  async function toggleCallMode() {
    if (!peerRef.current || !socket || !partnerId || !connected || renegotiatingRef.current) return;
    renegotiatingRef.current = true;
    const nextType = activeCallType === "video" ? "audio" : "video";
    try {
      const videoTransceiver = videoTransceiverRef.current;
      if (!videoTransceiver) throw new Error("The call video channel is not ready yet.");

      if (nextType === "video") {
        await applyLocalVideoMode(true);
      } else {
        await applyLocalVideoMode(false);
      }

      const offer = await peerRef.current.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: true,
      });
      await peerRef.current.setLocalDescription(offer);
      setActiveCallType(nextType);
      socket.emit("call-mode-offer", {
        to: incomingCall?.from || partnerId,
        offer,
        callId: incomingCall?.callId || callIdRef.current || callId,
        mode: nextType,
      });
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
    if (endingRef.current) return;
    endingRef.current = true;
    const activeCallId = incomingCall?.callId || callIdRef.current || callId;
    const target = incomingCall?.from || partnerId;
    if (target && activeCallId) socket?.emit("call-rejected", { to: target, callId: activeCallId, reason });
    stopNativeIncomingCall(activeCallId);
    ringtoneRef.current?.stop?.();
    cleanupMedia();
    onClose?.();
  }

  function finish(notify = true) {
    if (endingRef.current) return;
    endingRef.current = true;
    const activeCallId = incomingCall?.callId || callIdRef.current || callId;
    const target = incomingCall?.from || partnerId;
    if (notify && target && activeCallId) socket?.emit("end-call", { to: target, callId: activeCallId });
    ringtoneRef.current?.stop?.();
    stopNativeIncomingCall(activeCallId);
    cleanupMedia();
    onClose?.();
  }

  function cleanupMedia() {
    window.clearInterval(timerRef.current);
    window.clearInterval(ringTimerRef.current);
    window.clearTimeout(connectionRecoveryTimerRef.current);
    connectionRecoveryTimerRef.current = null;
    window.clearTimeout(recoveryDeadlineRef.current);
    recoveryDeadlineRef.current = null;
    iceRestartInFlightRef.current = false;
    peerRef.current?.close();
    peerRef.current = null;
    videoTransceiverRef.current = null;
    localStreamRef.current?.getTracks().forEach((track) => track.stop());
    localStreamRef.current = null;
    remoteStreamRef.current = null;
    remoteMediaReadyRef.current = false;
    pendingCandidatesRef.current = [];
    pendingOutgoingCandidatesRef.current = [];
    if (localVideoRef.current) localVideoRef.current.srcObject = null;
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
    if (remoteAudioRef.current) remoteAudioRef.current.srcObject = null;
  }

  const mins = String(Math.floor(duration / 60)).padStart(2, "0");
  const secs = String(duration % 60).padStart(2, "0");
  const displayDuration = `${mins}:${secs}`;

  return (
    <div className="call-overlay" role="dialog" aria-modal="true" aria-label={`${isVideo ? "Video" : "Audio"} call`} onClick={() => { if (audioPlaybackBlocked) void ensureRemoteAudioPlayback(); }}>
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

        <audio ref={remoteAudioRef} className="call-remote-audio" autoPlay playsInline muted={false} />
        {audioPlaybackBlocked && <button type="button" className="call-enable-audio" onClick={() => void ensureRemoteAudioPlayback()}>
          Enable call audio
        </button>}

        {isVideo ? (
          <div className="call-videos">
            <video ref={remoteVideoRef} className="remote-call-video" autoPlay playsInline muted />
            <video ref={localVideoRef} className="local-call-video" autoPlay muted playsInline />
            {!connected && <div className="call-video-placeholder">{incomingCall && !accepted ? "Answer to start the call" : status}</div>}
          </div>
        ) : (
          <div className="audio-call-center">
            <div className="audio-call-avatar"><img src={partner?.profileImage || incomingCall?.callerProfileImage || "/default-avatar.svg"} alt={partner?.fullName || "Member"} /></div>
            <h3>{partner?.fullName || incomingCall?.callerName || "Member"}</h3>
            <p>{connected ? `Connected • ${displayDuration}` : status}</p>
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
