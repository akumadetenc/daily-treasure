import { NextRequest, NextResponse } from "next/server"

function isPublicHttpUrl(value: string): URL | null {
  try {
    const url = new URL(value)
    if (url.protocol !== "http:" && url.protocol !== "https:") return null

    const host = url.hostname.toLowerCase()
    const blockedHost =
      host === "localhost" ||
      host.endsWith(".localhost") ||
      host === "127.0.0.1" ||
      host === "0.0.0.0" ||
      host === "::1" ||
      host.startsWith("192.168.") ||
      host.startsWith("10.") ||
      host.startsWith("169.254.") ||
      /^172\.(1[6-9]|2[0-9]|3[01])\./.test(host)

    return blockedHost ? null : url
  } catch {
    return null
  }
}

function decodeHtml(value: string): string {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#34;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\\u0026/g, "&")
    .replace(/\\\//g, "/")
}

function getMetaContent(html: string, property: string): string | null {
  const escaped = property.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
  const tags = html.match(/<meta\b[^>]*>/gi) ?? []

  for (const tag of tags) {
    const keyMatch = tag.match(/\b(?:property|name)\s*=\s*["']([^"']+)["']/i)
    if (keyMatch?.[1]?.toLowerCase() !== property.toLowerCase()) continue

    const contentMatch = tag.match(/\bcontent\s*=\s*["']([^"']*)["']/i)
    if (contentMatch?.[1]) return decodeHtml(contentMatch[1])
  }

  // Keep the escaped value referenced so unusual property names remain safe.
  void escaped
  return null
}

function getAmazonImage(html: string): string | null {
  const patterns = [
    /data-old-hires\s*=\s*["'](https?:\/\/[^"']+)["']/i,
    /id\s*=\s*["']landingImage["'][^>]*data-old-hires\s*=\s*["'](https?:\/\/[^"']+)["']/i,
    /id\s*=\s*["']landingImage["'][^>]*src\s*=\s*["'](https?:\/\/[^"']+)["']/i,
    /["']hiRes["']\s*:\s*["'](https?:\\?\/\\?\/[^"']+)["']/i,
    /["']large["']\s*:\s*["'](https?:\\?\/\\?\/[^"']+)["']/i,
  ]

  for (const pattern of patterns) {
    const match = html.match(pattern)
    if (match?.[1]) {
      const image = decodeHtml(match[1]).replace(/\\\//g, "/")
      if (image.startsWith("https://") || image.startsWith("http://")) return image
    }
  }

  // Amazon sometimes stores image URLs as keys in data-a-dynamic-image JSON.
  const dynamicMatch = html.match(/data-a-dynamic-image\s*=\s*["']([^"']+)["']/i)
  if (dynamicMatch?.[1]) {
    const raw = decodeHtml(dynamicMatch[1])
    try {
      const images = JSON.parse(raw) as Record<string, unknown>
      const firstUrl = Object.keys(images).find(
        (key) => key.startsWith("https://") || key.startsWith("http://")
      )
      if (firstUrl) return firstUrl
    } catch {
      // Continue to other image candidates if Amazon's JSON is malformed.
    }
  }

  return null
}

export async function POST(request: NextRequest) {
  try {
    const body: unknown = await request.json()
    const value =
      body && typeof body === "object" && "url" in body && typeof body.url === "string"
        ? body.url
        : null
    const url = value ? isPublicHttpUrl(value) : null

    if (!url) {
      return NextResponse.json({ imageUrl: null }, { status: 400 })
    }

    const response = await fetch(url.toString(), {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "ja-JP,ja;q=0.9,en-US;q=0.8,en;q=0.7",
      },
      redirect: "follow",
      signal: AbortSignal.timeout(10000),
    })

    if (!response.ok) return NextResponse.json({ imageUrl: null })

    const contentType = response.headers.get("content-type") ?? ""
    // Amazonの短縮URL経由ではContent-Typeが空で返る場合がある。
    // Content-Typeが明示されていてHTML以外の場合だけ終了し、空なら本文を解析する。
    if (contentType && !contentType.toLowerCase().includes("text/html") &&
        !contentType.toLowerCase().includes("application/xhtml+xml")) {
      return NextResponse.json({ imageUrl: null })
    }

    const html = (await response.text()).slice(0, 2_000_000)
    // 短縮URL（amzn.asia など）は、最終的にAmazonへ転送されても
    // 入力URLのホスト名はAmazonではないため、ホスト名で制限せず商品画像候補も調べる。
    const image =
      getMetaContent(html, "og:image") ??
      getMetaContent(html, "twitter:image") ??
      getAmazonImage(html)

    if (!image) return NextResponse.json({ imageUrl: null })

    let imageUrl: URL
    try {
      imageUrl = new URL(image, response.url || url.toString())
    } catch {
      return NextResponse.json({ imageUrl: null })
    }

    if (imageUrl.protocol !== "https:" && imageUrl.protocol !== "http:") {
      return NextResponse.json({ imageUrl: null })
    }

    return NextResponse.json({ imageUrl: imageUrl.toString() })
  } catch (error) {
    console.error("商品画像の取得に失敗しました:", error)
    return NextResponse.json({ imageUrl: null })
  }
}
