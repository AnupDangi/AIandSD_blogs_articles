/** Pure helpers for the embedded YouTube player. IDs come only from recognized YouTube hosts. */
export function youtubeVideoId(rawUrl: string): string | null {
  try {
    const url = new URL(rawUrl);
    if (url.protocol !== "https:") return null;
    let id: string | null = null;
    if (url.hostname === "youtu.be") id = url.pathname.slice(1);
    if (url.hostname === "youtube.com" || url.hostname === "www.youtube.com") {
      id = url.pathname === "/watch" ? url.searchParams.get("v") : url.pathname.startsWith("/embed/") ? url.pathname.slice(7) : null;
    }
    return id && /^[A-Za-z0-9_-]{11}$/.test(id) ? id : null;
  } catch { return null; }
}

/** Accepts `731`, `731s`, and `1h2m3s`. Anything else is treated as the start of the video. */
export function parseTimeParam(value: string | null): number {
  if (!value) return 0;
  if (/^\d+$/.test(value)) return Math.min(Number(value), MAX_SECONDS);
  const match = /^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/.exec(value);
  if (!match || !(match[1] || match[2] || match[3])) return 0;
  return Math.min(Number(match[1] ?? 0) * 3600 + Number(match[2] ?? 0) * 60 + Number(match[3] ?? 0), MAX_SECONDS);
}

export function startSeconds(rawUrl: string): number {
  try {
    const url = new URL(rawUrl);
    return parseTimeParam(url.searchParams.get("t") ?? url.searchParams.get("start"));
  } catch { return 0; }
}

export type VideoChapter = { seconds: number; time: string; label: string };

/** Reads published chapter labels such as `12:11 · Transformer Architecture; 16:51 · Masked Attention`. */
export function parseChapters(section: string | null | undefined): VideoChapter[] {
  if (!section) return [];
  const chapters: VideoChapter[] = [];
  for (const part of section.split(";")) {
    const match = /^\s*(\d{1,2}(?::\d{2}){1,2})\s*·\s*(.+?)\s*$/.exec(part);
    if (!match) continue;
    const seconds = clockToSeconds(match[1]);
    if (seconds !== null) chapters.push({ seconds, time: match[1], label: match[2] });
  }
  return chapters;
}

function clockToSeconds(clock: string): number | null {
  const parts = clock.split(":").map(Number);
  if (parts.some((part) => !Number.isInteger(part)) || parts.slice(1).some((part) => part > 59)) return null;
  return parts.reduce((total, part) => total * 60 + part, 0);
}

/** Privacy-enhanced embed host: no cookies are set until the learner plays the video. */
export function embedUrl(videoId: string, startAt: number, origin: string): string {
  const params = new URLSearchParams({ autoplay: "1", rel: "0", playsinline: "1", enablejsapi: "1", start: String(Math.max(0, Math.floor(startAt))) });
  if (origin) params.set("origin", origin);
  return `https://www.youtube-nocookie.com/embed/${videoId}?${params.toString()}`;
}

/** Command understood by the embedded player once `enablejsapi=1` is set. */
export function seekCommand(seconds: number): string {
  return JSON.stringify({ event: "command", func: "seekTo", args: [Math.max(0, Math.floor(seconds)), true] });
}
export function playCommand(): string {
  return JSON.stringify({ event: "command", func: "playVideo", args: [] });
}

const MAX_SECONDS = 24 * 3600;
