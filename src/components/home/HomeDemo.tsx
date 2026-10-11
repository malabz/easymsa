import { useEffect, useRef, useState } from "react";
import { Maximize, Minimize, Pause, Play, RotateCcw } from "lucide-react";
import { Link } from "react-router-dom";
import type { Locale } from "../../lib/i18n/dictionary";
import { HOME_DEMO, homeContent, homeMedia } from "../../lib/homeContent";

export function formatDemoTime(seconds: number) {
  const safe = Math.max(0, Math.floor(Number.isFinite(seconds) ? seconds : 0));
  return `${Math.floor(safe / 60)}:${String(safe % 60).padStart(2, "0")}`;
}

export function HomeDemo({ locale }: { locale: Locale }) {
  const copy = homeContent[locale];
  const d = copy.demo;
  const media = homeMedia(locale);
  const container = useRef<HTMLDivElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const intent = useRef<"auto" | "play" | "pause">("auto");
  const visible = useRef(false);
  const autoBlocked = useRef(false);
  const pendingSeek = useRef<number | null>(null);
  const sourceErrors = useRef(new Set<string>());
  const [load, setLoad] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState<number>(HOME_DEMO.duration);
  const [revision, setRevision] = useState(0);
  const [fullscreen, setFullscreen] = useState(false);
  const [notice, setNotice] = useState("");

  function wantsToPlay() {
    return visible.current && !document.hidden && intent.current !== "pause" &&
      (intent.current === "play" || !autoBlocked.current);
  }

  useEffect(() => {
    if (load) video.current?.load();
  }, [load, revision]);

  function syncPlayback() {
    const element = video.current;
    if (!element) return;
    if (!wantsToPlay()) { element.pause(); return; }
    setLoad(true);
    if (element.readyState < 2) return;
    void element.play().catch(() => {
      autoBlocked.current = true;
      setPlaying(false);
    });
  }

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      visible.current = entry.isIntersecting && entry.intersectionRatio >= 0.3;
      syncPlayback();
    }, { threshold: [0, 0.3, 1] });
    if (container.current) observer.observe(container.current);
    const fullscreenChange = () => setFullscreen(document.fullscreenElement === container.current);
    document.addEventListener("visibilitychange", syncPlayback);
    document.addEventListener("fullscreenchange", fullscreenChange);
    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", syncPlayback);
      document.removeEventListener("fullscreenchange", fullscreenChange);
      video.current?.pause();
    };
  }, []);

  function requestPlay() {
    intent.current = "play";
    autoBlocked.current = false;
    setLoad(true);
    syncPlayback();
  }

  function togglePlayback() {
    if (playing) {
      intent.current = "pause";
      video.current?.pause();
    } else requestPlay();
  }

  function seek(seconds: number, play = false) {
    const next = Math.min(Math.max(0, seconds), duration);
    setCurrent(next);
    setLoad(true);
    if (video.current && video.current.readyState >= 1) video.current.currentTime = next;
    else pendingSeek.current = next;
    if (play) requestPlay();
  }

  function retry() {
    sourceErrors.current.clear();
    setFailed(false);
    setReady(false);
    setCurrent(0);
    setRevision(value => value + 1);
    intent.current = "play";
    autoBlocked.current = false;
    setLoad(true);
  }

  async function toggleFullscreen() {
    setNotice("");
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else if (container.current?.requestFullscreen) await container.current.requestFullscreen();
      else {
        const iosVideo = video.current as (HTMLVideoElement & { webkitEnterFullscreen?: () => void }) | null;
        if (iosVideo?.webkitEnterFullscreen) iosVideo.webkitEnterFullscreen();
        else setNotice(d.fullscreenUnavailable);
      }
    } catch { setNotice(d.fullscreenUnavailable); }
  }

  function sourceFailed(source: string) {
    sourceErrors.current.add(source);
    if (sourceErrors.current.size >= 2) { setFailed(true); setPlaying(false); }
  }

  const activeChapter = HOME_DEMO.chapterTimes.reduce<number>((active, start, index) => current >= start ? index : active, 0);

  return (
    <div className="home-demo" ref={container} role="region" aria-label={d.label}>
      <div className="home-demo-stage">
        <video
          key={revision} ref={video} className={failed ? "invisible" : ""}
          poster={media.poster} muted loop playsInline preload={load ? "auto" : "none"}
          aria-hidden="true"
          onLoadedMetadata={() => {
            const element = video.current;
            if (!element) return;
            if (Number.isFinite(element.duration)) setDuration(element.duration);
            if (pendingSeek.current !== null) { element.currentTime = pendingSeek.current; pendingSeek.current = null; }
          }}
          onCanPlay={() => { setReady(true); syncPlayback(); }}
          onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)}
          onTimeUpdate={() => setCurrent(video.current?.currentTime ?? 0)}
          onError={event => { if (event.target === event.currentTarget) { setFailed(true); setPlaying(false); } }}
        >
          {load && <>
            <source src={media.mp4} type="video/mp4" onError={() => sourceFailed("mp4")} />
            <source src={media.webm} type="video/webm" onError={() => sourceFailed("webm")} />
          </>}
        </video>
        {failed && <img className="home-demo-fallback" src={media.poster} alt="" />}
        {!playing && !failed && <button type="button" className="home-demo-play" onClick={requestPlay} aria-label={d.play}><Play aria-hidden="true" size={24} fill="currentColor" /></button>}
        {load && !ready && !failed && <span className="home-demo-loading" role="status">{d.loading}</span>}
        {failed && <div className="home-demo-error" role="status"><p>{d.unavailable}</p><button type="button" onClick={retry}><RotateCcw size={16} aria-hidden="true" />{d.replay}</button><Link to={HOME_DEMO.exampleRoute}>{copy.openExample}</Link></div>}
      </div>
      <div className="home-demo-controls">
        <div className="home-demo-transport">
          <button type="button" className="home-icon-button" onClick={togglePlayback} disabled={failed} aria-label={playing ? d.pause : d.play}>{playing ? <Pause size={18} fill="currentColor" aria-hidden="true" /> : <Play size={18} fill="currentColor" aria-hidden="true" />}</button>
          <span className="home-demo-time" aria-hidden="true">{formatDemoTime(current)} / {formatDemoTime(duration)}</span>
          <input className="home-demo-progress" type="range" min={0} max={duration} step={0.1} value={current} onChange={event => seek(Number(event.target.value))} disabled={failed} aria-label={d.seek} aria-valuetext={`${formatDemoTime(current)}${d.of}${formatDemoTime(duration)}`} />
          <button type="button" className="home-icon-button" onClick={() => void toggleFullscreen()} aria-label={fullscreen ? d.exitFullscreen : d.fullscreen}>{fullscreen ? <Minimize size={18} aria-hidden="true" /> : <Maximize size={18} aria-hidden="true" />}</button>
        </div>
        <nav className="home-demo-chapters" aria-label={d.chapterLabel}>
          {d.chapters.map((label, index) => <button type="button" key={label} disabled={failed} aria-current={activeChapter === index ? "step" : undefined} onClick={() => seek(HOME_DEMO.chapterTimes[index], true)}><span aria-hidden="true" />{label}</button>)}
        </nav>
      </div>
      {notice && <p className="home-demo-notice" role="status">{notice}</p>}
    </div>
  );
}
