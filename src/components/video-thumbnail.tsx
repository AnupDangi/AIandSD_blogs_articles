/** Display-only YouTube preview. IDs are extracted only from recognized YouTube hosts. */
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

export function VideoThumbnail({ url, title, compact = false }: { url: string; title: string; compact?: boolean }) {
  const id = youtubeVideoId(url);
  if (!id) return null;
  return <a className={`video-thumbnail${compact ? " video-thumbnail-compact" : ""}`} href={url} target="_blank" rel="noopener noreferrer" aria-label={`Watch ${title} on YouTube (opens in a new tab)`} style={{ backgroundImage: `linear-gradient(0deg, rgba(13,31,37,.5), rgba(13,31,37,.12)), url(https://i.ytimg.com/vi/${id}/hqdefault.jpg)` }}><span aria-hidden="true">▶</span><small>Watch on YouTube</small></a>;
}
