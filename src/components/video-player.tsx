"use client";

import { useMemo, useRef, useState } from "react";
import { embedUrl, parseChapters, playCommand, seekCommand, startSeconds, youtubeVideoId } from "@/lib/video";

const PLAYER_ORIGIN = "https://www.youtube-nocookie.com";

/**
 * Click-to-load YouTube player. Nothing from YouTube loads until the learner presses play,
 * and chapter buttons seek the running player through its documented postMessage commands.
 */
export function VideoPlayer({ url, title, section, compact = false }: { url: string; title: string; section?: string | null; compact?: boolean }) {
  const id = youtubeVideoId(url);
  const chapters = useMemo(() => parseChapters(section), [section]);
  const frame = useRef<HTMLIFrameElement>(null);
  const [source, setSource] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [status, setStatus] = useState("");
  if (!id) return null;

  function play(seconds: number, label: string) {
    const target = frame.current?.contentWindow;
    if (source && loaded && target) {
      target.postMessage(seekCommand(seconds), PLAYER_ORIGIN);
      target.postMessage(playCommand(), PLAYER_ORIGIN);
    } else {
      setLoaded(false);
      setSource(embedUrl(id!, seconds, window.location.origin));
    }
    setStatus(`Playing ${title} from ${label}.`);
  }

  const start = startSeconds(url);
  return <div className={`video-embed${compact ? " video-embed-compact" : ""}${source ? " video-embed-active" : ""}`}>
    {source
      ? <div className="video-frame"><iframe ref={frame} src={source} title={`${title} (YouTube video)`} allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowFullScreen referrerPolicy="strict-origin-when-cross-origin" onLoad={() => setLoaded(true)}></iframe></div>
      : <button type="button" className="video-thumbnail" onClick={() => play(start, start ? formatClock(start) : "the start")} aria-label={`Play ${title}${start ? ` from ${formatClock(start)}` : ""} (loads YouTube)`} style={{ backgroundImage: `linear-gradient(0deg, rgba(13,31,37,.5), rgba(13,31,37,.12)), url(https://i.ytimg.com/vi/${id}/hqdefault.jpg)` }}><span aria-hidden="true">▶</span><small>Play here</small></button>}
    {chapters.length > 0 && <ul className="video-chapters" aria-label={`Jump to a chapter in ${title}`}>{chapters.map((chapter) => <li key={chapter.seconds}><button type="button" onClick={() => play(chapter.seconds, `${chapter.time} ${chapter.label}`)}><span className="video-chapter-time">{chapter.time}</span> {chapter.label}</button></li>)}</ul>}
    <span className="sr-only" role="status" aria-live="polite">{status}</span>
  </div>;
}

function formatClock(totalSeconds: number) {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const pad = (value: number) => String(value).padStart(2, "0");
  return hours ? `${hours}:${pad(minutes)}:${pad(seconds)}` : `${pad(minutes)}:${pad(seconds)}`;
}
