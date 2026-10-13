import { describe, expect, it } from "vitest";
import resources from "../curriculum/resources.json";
import { embedUrl, parseChapters, parseTimeParam, seekCommand, startSeconds, youtubeVideoId } from "../src/lib/video";

describe("youtubeVideoId", () => {
  it("accepts only https YouTube hosts with an 11-character id", () => {
    expect(youtubeVideoId("https://www.youtube.com/watch?v=MyFrMFab6bo&t=731s")).toBe("MyFrMFab6bo");
    expect(youtubeVideoId("https://youtu.be/mF4CaijvJos")).toBe("mF4CaijvJos");
    expect(youtubeVideoId("https://www.youtube.com/embed/mF4CaijvJos")).toBe("mF4CaijvJos");
    expect(youtubeVideoId("http://www.youtube.com/watch?v=MyFrMFab6bo")).toBeNull();
    expect(youtubeVideoId("https://evil.example/watch?v=MyFrMFab6bo")).toBeNull();
    expect(youtubeVideoId("https://www.youtube.com.evil.example/watch?v=MyFrMFab6bo")).toBeNull();
    expect(youtubeVideoId("https://www.youtube.com/watch?v=short")).toBeNull();
    expect(youtubeVideoId("not a url")).toBeNull();
  });
});

describe("start times", () => {
  it("parses seconds and h/m/s forms and rejects junk", () => {
    expect(parseTimeParam("731")).toBe(731);
    expect(parseTimeParam("731s")).toBe(731);
    expect(parseTimeParam("1h2m3s")).toBe(3723);
    expect(parseTimeParam("2m")).toBe(120);
    expect(parseTimeParam("")).toBe(0);
    expect(parseTimeParam(null)).toBe(0);
    expect(parseTimeParam("abc")).toBe(0);
    expect(parseTimeParam("-5")).toBe(0);
    expect(parseTimeParam("99999999")).toBe(86400);
  });
  it("reads t or start from the URL", () => {
    expect(startSeconds("https://www.youtube.com/watch?v=MyFrMFab6bo&t=731s")).toBe(731);
    expect(startSeconds("https://youtu.be/mF4CaijvJos?start=45")).toBe(45);
    expect(startSeconds("https://youtu.be/mF4CaijvJos")).toBe(0);
  });
});

describe("parseChapters", () => {
  it("reads published chapter labels and skips free text", () => {
    expect(parseChapters("12:11 · Transformer Architecture; 16:51 · Masked Multi-Head Attention")).toEqual([
      { seconds: 731, time: "12:11", label: "Transformer Architecture" },
      { seconds: 1011, time: "16:51", label: "Masked Multi-Head Attention" },
    ]);
    expect(parseChapters("1:02:03 · Long talk")[0].seconds).toBe(3723);
    expect(parseChapters("Linked recording: How To Build AI Evals")).toEqual([]);
    expect(parseChapters("12:75 · Bad minutes")).toEqual([]);
    expect(parseChapters(undefined)).toEqual([]);
  });
  it("finds chapters for exactly the lectures with published chapter lists", () => {
    const withChapters = resources.filter((item) => item.type === "video" && parseChapters(item.section).length > 0).map((item) => item.id);
    expect(withChapters).toEqual(["fsdl-llm-foundations-video", "fsdl-prompt-engineering-video", "fsdl-llmops-video", "fsdl-askfsdl-video"]);
  });
  it("every video resource has a playable id and every chapter lands inside a sane range", () => {
    for (const item of resources.filter((entry) => entry.type === "video")) {
      expect(youtubeVideoId(item.url), item.id).not.toBeNull();
      for (const chapter of parseChapters(item.section)) expect(chapter.seconds, item.id).toBeLessThan(6 * 3600);
    }
  });
});

describe("embed and commands", () => {
  it("uses the no-cookie host and an integer start", () => {
    const url = new URL(embedUrl("MyFrMFab6bo", 731.9, "https://learn.example"));
    expect(url.hostname).toBe("www.youtube-nocookie.com");
    expect(url.pathname).toBe("/embed/MyFrMFab6bo");
    expect(url.searchParams.get("start")).toBe("731");
    expect(url.searchParams.get("autoplay")).toBe("1");
    expect(url.searchParams.get("enablejsapi")).toBe("1");
    expect(url.searchParams.get("origin")).toBe("https://learn.example");
  });
  it("builds the seek command", () => {
    expect(JSON.parse(seekCommand(1011.7))).toEqual({ event: "command", func: "seekTo", args: [1011, true] });
  });
});
