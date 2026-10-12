import React, { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { LiveKitRoom, RoomAudioRenderer, VideoConference } from "@livekit/components-react";
import { MediaDeviceFailure } from "livekit-client";
import "@livekit/components-styles";
import { ArrowLeft, LoaderCircle, Video } from "lucide-react";
import Layout from "../components/layout/Layout";
import { liveClassApi } from "../api/liveClass.api";
import { useAuth } from "../context/AuthContext";

const LiveClassroom = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const dashboardPath = user?.role === "teacher" || user?.role === "admin" ? "/teacher/live-classes" : "/dashboard";
  const [access, setAccess] = useState(null);
  const [error, setError] = useState("");
  const [deviceError, setDeviceError] = useState("");
  const [connecting, setConnecting] = useState(true);

  useEffect(() => {
    let active = true;
    liveClassApi.token(id)
      .then((result) => {
        if (!active) return;
        if (!result?.token || !result?.serverUrl) throw new Error("The classroom connection is not configured. Ask the site administrator to configure LiveKit.");
        setAccess(result);
      })
      .catch((err) => { if (active) setError(err.message || "Could not authorize access to this class."); })
      .finally(() => { if (active) setConnecting(false); });
    return () => { active = false; };
  }, [id]);

  if (connecting) return <Layout noFooter><div className="min-h-[70vh] flex items-center justify-center gap-3 text-slate-600" role="status"><LoaderCircle className="animate-spin" /> Connecting to class...</div></Layout>;

  if (error || !access) return <Layout><main className="max-w-2xl mx-auto px-4 py-16 text-center"><div className="w-14 h-14 mx-auto rounded-2xl bg-brand-50 text-brand-600 flex items-center justify-center"><Video /></div><h1 className="section-title mt-5">Unable to join class</h1><p role="alert" className="text-slate-600 mt-3">{error || "Class access could not be verified."}</p><Link to={dashboardPath} className="btn-primary mt-6"><ArrowLeft size={16} /> Back to dashboard</Link></main></Layout>;

  return <Layout noFooter><main className="h-[calc(100dvh-4rem)] min-h-[32rem] flex flex-col bg-slate-950">
    <header className="shrink-0 h-14 px-4 sm:px-6 flex items-center justify-between gap-3 bg-white border-b border-slate-200">
      <div className="min-w-0"><h1 className="font-semibold text-slate-900 truncate">{access.classTitle || "Live Class"}</h1><p className="text-xs text-slate-500">Live classroom · chat is available during this session</p></div>
      <button className="btn-secondary shrink-0" onClick={() => navigate(dashboardPath)}><ArrowLeft size={15} /> Leave class</button>
    </header>
    <div className="flex-1 min-h-0" aria-label="Live video classroom">
      <LiveKitRoom
        serverUrl={access.serverUrl}
        token={access.token}
        connect
        audio={false}
        video={false}
        onConnected={() => setError("")}
        onDisconnected={() => navigate(dashboardPath, { replace: true })}
        onError={(connectionError) => setError(connectionError.message || "The media connection failed. Check your network and retry.")}
        onMediaDeviceFailure={(failure, kind) => {
          const device = kind === "audioinput" ? "microphone" : "camera";
          if (failure === MediaDeviceFailure.PermissionDenied) setDeviceError(`${device[0].toUpperCase()}${device.slice(1)} permission was denied. Allow access in your browser settings, then retry using the ${device} control.`);
          else if (failure === MediaDeviceFailure.NotFound) setDeviceError(`No ${device} was found. Connect a device, then retry using the ${device} control.`);
          else setDeviceError(`Could not start the ${device}. Check that it is available, then retry using its control.`);
        }}
        className="h-full"
      >
        {error ? <div className="h-full flex flex-col items-center justify-center p-6 text-center text-white"><p role="alert">{error}</p><button className="btn-secondary mt-4" onClick={() => window.location.reload()}>Retry connection</button></div> : <><VideoConference />{deviceError && <div role="alert" className="fixed bottom-20 left-1/2 z-50 -translate-x-1/2 max-w-xl rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900 shadow-lg">{deviceError}<button className="ml-3 font-semibold underline" onClick={() => setDeviceError("")}>Retry</button></div>}<RoomAudioRenderer /></>}
      </LiveKitRoom>
    </div>
  </main></Layout>;
};

export default LiveClassroom;
