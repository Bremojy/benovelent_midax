import { useEffect, useRef, useState } from "react";
import { Mic, MicOff, Phone, PhoneOff, Video, VideoOff } from "lucide-react";
import "./CallOverlay.css";

const ICE_SERVERS = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
];

export default function CallOverlay({ socket, currentUser, partner, callType, incomingCall, onClose }) {
  const [status, setStatus] = useState(incomingCall ? "Incoming call" : "Calling...");
  const [connected, setConnected] = useState(false);
  const [muted, setMuted] = useState(false);
  const [cameraOff, setCameraOff] = useState(callType !== "video");
  const [error, setError] = useState("");
  const [accepted, setAccepted] = useState(!incomingCall);
  const [duration, setDuration] = useState(0);
  const peerRef = useRef(null);
  const localStreamRef = useRef(null);
  const remoteStreamRef = useRef(null);
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const remoteAudioRef = useRef(null);
  const pendingCandidatesRef = useRef([]);
  const timerRef = useRef(null);

  const me = String(currentUser?.chatId || currentUser?._id || "");
  const partnerId = String(partner?._id || partner?.id || incomingCall?.callerUserId || "");

  useEffect(() => {
    if (connected) {
      timerRef.current = window.setInterval(() => setDuration((value) => value + 1), 1000);
    }
    return () => window.clearInterval(timerRef.current);
  }, [connected]);

  useEffect(() => {
    if (!socket) return;

    const handleAnswered = async ({ answer }) => {
      if (!peerRef.current || !answer) return;
      try {
        await peerRef.current.setRemoteDescription(new RTCSessionDescription(answer));
        await flushCandidates();
      } catch (err) {
        setError(err.message || "Could not establish the call.");
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

    socket.on("call-answered", handleAnswered);
    socket.on("ice-candidate", handleCandidate);
    socket.on("call-ended", handleEnded);
    socket.on("call-rejected", handleEnded);

    return () => {
      socket.off("call-answered", handleAnswered);
      socket.off("ice-candidate", handleCandidate);
      socket.off("call-ended", handleEnded);
      socket.off("call-rejected", handleEnded);
    };
  }, [socket]);

  useEffect(() => {
    if (!accepted) return;
    startCall().catch((err) => setError(err.message || "Camera or microphone access failed."));
    return () => cleanupMedia();
  }, [accepted]);

  async function createPeer() {
    const peer = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    peerRef.current = peer;
    peer.onicecandidate = (event) => {
      if (event.candidate && partnerId) {
        socket?.emit("ice-candidate", { to: partnerId, candidate: event.candidate });
      }
    };
    peer.ontrack = (event) => {
      const stream = event.streams?.[0];
      if (!stream) return;
      remoteStreamRef.current = stream;
      if (remoteVideoRef.current) remoteVideoRef.current.srcObject = stream;
      if (remoteAudioRef.current) remoteAudioRef.current.srcObject = stream;
    };
    peer.onconnectionstatechange = () => {
      const state = peer.connectionState;
      if (state === "connected") {
        setConnected(true);
        setStatus("Connected");
      } else if (["failed", "disconnected", "closed"].includes(state)) {
        setConnected(false);
        if (state === "failed") setError("The call connection failed. Check your internet connection.");
      }
    };
    return peer;
  }

  async function getMedia() {
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error("Your browser does not support camera and microphone calls.");
    }
    return navigator.mediaDevices.getUserMedia({
      audio: true,
      video: callType === "video" ? { facingMode: "user" } : false,
    });
  }

  async function startCall() {
    if (!socket || !partnerId || !accepted) return;
    const stream = await getMedia();
    localStreamRef.current = stream;
    if (localVideoRef.current) localVideoRef.current.srcObject = stream;
    const peer = await createPeer();
    stream.getTracks().forEach((track) => peer.addTrack(track, stream));

    if (incomingCall) {
      await peer.setRemoteDescription(new RTCSessionDescription(incomingCall.offer));
      await flushCandidates();
      const answer = await peer.createAnswer();
      await peer.setLocalDescription(answer);
      socket.emit("call-answer", { to: incomingCall.from, answer });
      setStatus("Connecting...");
    } else {
      const offer = await peer.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: callType === "video" });
      await peer.setLocalDescription(offer);
      socket.emit("call-user", {
        to: partnerId,
        conversationId: incomingCall?.conversationId,
        callType,
        callerUserId: me,
        callerName: currentUser?.fullName || currentUser?.name || "Member",
        offer,
      });
    }
  }

  async function flushCandidates() {
    if (!peerRef.current?.remoteDescription) return;
    const candidates = pendingCandidatesRef.current.splice(0);
    for (const candidate of candidates) {
      try {
        await peerRef.current.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (err) {
        console.warn("Queued ICE candidate error", err);
      }
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

  function rejectCall() {
    if (incomingCall?.from) socket?.emit("call-rejected", { to: incomingCall.from });
    finish(false);
  }

  function finish(notify = true) {
    if (notify && partnerId) socket?.emit("end-call", { to: incomingCall?.from || partnerId });
    cleanupMedia();
    onClose?.();
  }

  function cleanupMedia() {
    peerRef.current?.close();
    peerRef.current = null;
    localStreamRef.current?.getTracks().forEach((track) => track.stop());
    localStreamRef.current = null;
    if (localVideoRef.current) localVideoRef.current.srcObject = null;
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
    if (remoteAudioRef.current) remoteAudioRef.current.srcObject = null;
  }

  const mins = String(Math.floor(duration / 60)).padStart(2, "0");
  const secs = String(duration % 60).padStart(2, "0");
  const isVideo = callType === "video";

  return (
    <div className="call-overlay" role="dialog" aria-modal="true" aria-label={`${isVideo ? "Video" : "Audio"} call`}>
      <div className="call-card">
        <div className="call-card-header">
          <div>
            <span className="call-kicker">{isVideo ? "VIDEO CALL" : "AUDIO CALL"}</span>
            <h2>{partner?.fullName || incomingCall?.callerName || "Member"}</h2>
            <p>{connected ? durationText(mins, secs) : status}</p>
          </div>
          <span className={`call-status-dot ${connected ? "connected" : ""}`} />
        </div>

        {error && <div className="call-error">{error}</div>}

        {isVideo ? (
          <div className="call-videos">
            <video ref={remoteVideoRef} className="remote-call-video" autoPlay playsInline />
            <video ref={localVideoRef} className="local-call-video" autoPlay muted playsInline />
            {!connected && <div className="call-video-placeholder">{incomingCall && !accepted ? "Incoming video call" : "Waiting for connection..."}</div>}
          </div>
        ) : (
          <div className="audio-call-center">
            <audio ref={remoteAudioRef} autoPlay />
            <div className="audio-call-avatar"><img src={partner?.profileImage || "/default-avatar.svg"} alt="" /></div>
            <strong>{connected ? "Call in progress" : status}</strong>
          </div>
        )}

        <div className="call-controls">
          {incomingCall && !accepted ? (
            <>
              <button className="call-control accept" type="button" onClick={() => setAccepted(true)}><Phone size={20} /> Accept</button>
              <button className="call-control decline" type="button" onClick={rejectCall}><PhoneOff size={20} /> Decline</button>
            </>
          ) : (
            <>
              <button className="call-control" type="button" onClick={toggleMute}>{muted ? <MicOff size={20} /> : <Mic size={20} />}{muted ? "Unmute" : "Mute"}</button>
              {isVideo && <button className="call-control" type="button" onClick={toggleCamera}>{cameraOff ? <VideoOff size={20} /> : <Video size={20} />}{cameraOff ? "Camera on" : "Camera off"}</button>}
              <button className="call-control decline" type="button" onClick={() => finish(true)}><PhoneOff size={20} /> End</button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function durationText(mins, secs) { return `Connected • ${mins}:${secs}`; }
