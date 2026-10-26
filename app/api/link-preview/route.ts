import { NextResponse } from "next/server";


function isBlockedHost(hostname: string) {
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (
    host === "localhost" ||
    host.endsWith(".localhost") ||
    host === "::1" ||
    host === "0.0.0.0" ||
    host.endsWith(".local") ||
    host.endsWith(".internal")
  ) return true;

  // Block literal private/reserved IPv4 addresses.
  const parts = host.split(".");
  if (parts.length === 4 && parts.every((part) => /^\d+$/.test(part))) {
    const octets = parts.map(Number);
    if (octets.some((n) => n < 0 || n > 255)) return true;
    const [a, b] = octets;
    if (
      a === 10 ||
      a === 127 ||
      a === 0 ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      (a === 100 && b >= 64 && b <= 127) ||
      a >= 224
    ) return true;
  }
  return false;
}

function getMeta(html: string, keys: string[]) {
  for (const key of keys) {
    const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const patterns = [
      new RegExp(`<meta[^>]+(?:property|name)=["']${escaped}["'][^>]+content=["']([^"']*)["'][^>]*>`, "i"),
      new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]+(?:property|name)=["']${escaped}["'][^>]*>`, "i"),
    ];
    for (const pattern of patterns) {
      const match = html.match(pattern);
      if (match?.[1]) return decodeEntities(match[1].trim());
    }
  }
  return "";
}

function decodeEntities(value: string) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(parseInt(code, 16)));
}

function cleanPageTitle(value: string, hostname: string) {
  let title = decodeEntities(value).replace(/\s+/g, " ").trim();
  const host = hostname.toLowerCase();
  if (host.includes("ebookjapan.yahoo.co.jp") || host.includes("ebookjapan")) {
    title = title
      .replace(/^【[^】]*】\s*/, "")
      .replace(/\s*[-｜|｜]\s*(?:無料漫画|無料マンガ|試し読み|電子書籍通販|ebookjapan|ebook Japan).*$/i, "")
      .replace(/\s*[-｜|｜]\s*$/, "")
      .trim();
  }
  return title;
}

function absoluteUrl(value: string, base: string) {
  if (!value) return "";
  try {
    return new URL(value, base).toString();
  } catch {
    return "";
  }
}

function youtubeVideoId(url: URL) {
  if (url.hostname === "youtu.be") return url.pathname.split("/").filter(Boolean)[0] || "";
  if (url.hostname.endsWith("youtube.com") || url.hostname.endsWith("youtube-nocookie.com")) {
    if (url.pathname === "/watch") return url.searchParams.get("v") || "";
    const parts = url.pathname.split("/").filter(Boolean);
    if (["embed", "shorts", "live"].includes(parts[0])) return parts[1] || "";
  }
  return "";
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (typeof body?.url !== "string" || body.url.length > 2048) {
      return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
    }

    let url: URL;
    try {
      url = new URL(body.url);
    } catch {
      return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
    }

    if (!["http:", "https:"].includes(url.protocol) || isBlockedHost(url.hostname)) {
      return NextResponse.json({ error: "URL is not allowed" }, { status: 400 });
    }

    const videoId = youtubeVideoId(url);
    if (videoId && /^[\w-]{6,20}$/.test(videoId)) {
      return NextResponse.json({
        title: "",
        siteName: "YouTube",
        thumbnail: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
      });
    }

    const response = await fetch(url.toString(), {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; DailyTreasureLinkPreview/1.0)",
        "Accept": "text/html,application/xhtml+xml",
      },
      redirect: "follow",
      signal: AbortSignal.timeout(7000),
      cache: "no-store",
    });

    const finalUrl = new URL(response.url);
    if (isBlockedHost(finalUrl.hostname) || !["http:", "https:"].includes(finalUrl.protocol)) {
      return NextResponse.json({ title: "", thumbnail: "", siteName: "" });
    }

    const contentType = response.headers.get("content-type") || "";
    if (!response.ok || !contentType.toLowerCase().includes("text/html")) {
      return NextResponse.json({ title: "", thumbnail: "", siteName: "" });
    }

    const html = (await response.text()).slice(0, 1_000_000);
    const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    const rawTitle = getMeta(html, ["og:title", "twitter:title"]) || (titleMatch ? decodeEntities(titleMatch[1].replace(/<[^>]+>/g, "").trim()) : "");
    const title = cleanPageTitle(rawTitle, finalUrl.hostname);
    const thumbnailRaw = getMeta(html, ["og:image", "og:image:url", "twitter:image", "twitter:image:src"]);
    const siteName = getMeta(html, ["og:site_name"]) || finalUrl.hostname.replace(/^www\./, "");
    const thumbnail = absoluteUrl(thumbnailRaw, finalUrl.toString());

    return NextResponse.json({
      title: title.slice(0, 300),
      thumbnail,
      siteName: siteName.slice(0, 100),
    });
  } catch {
    return NextResponse.json({ title: "", thumbnail: "", siteName: "" }, { status: 200 });
  }
}
