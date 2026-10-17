import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type PeerTubeVideo = {
  id: number;
  uuid: string;
  name: string;
  description?: string;
  url?: string;
  embedPath?: string;
  thumbnailPath?: string;
  duration?: number;
  views?: number;
  licence?: { id?: number; label?: string };
  channel?: { name?: string; host?: string };
};

const allowedLicenceIds = new Set([1, 2, 3, 7, 8]);
// PeerTube licence IDs: CC BY, CC BY-SA, CC BY-ND, CC0/public domain, and free of known copyright restrictions.
// These allow reuse subject to each licence's conditions. We do not download
// or rehost files; results link/embed the original provider's video.

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (!query || query.length > 160) {
    return NextResponse.json({ error: "Enter a search term of 1–160 characters." }, { status: 400 });
  }

  const configuredHost = process.env.PEERTUBE_INSTANCE_URL || "https://peertube.tv";
  const hosts = [...new Set([configuredHost, "https://peer.tube"].filter(Boolean))];

  const fetchJson = async (url: URL) => {
    const response = await fetch(url, {
      headers: { Accept: "application/json" },
      next: { revalidate: 300 },
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) return null;
    return await response.json() as { data?: PeerTubeVideo[] };
  };

  try {
    for (const host of hosts) {
      let base: URL;
      try {
        base = new URL(host);
      } catch {
        continue;
      }
      if (base.protocol !== "https:" || base.username || base.password) continue;

      const endpoints = [
        new URL("/api/v1/search/videos", base),
        new URL("/api/v1/videos", base),
      ];
      endpoints[0].searchParams.set("searchTarget", "local");
      for (const endpoint of endpoints) {
        endpoint.searchParams.set("search", query);
        endpoint.searchParams.set("count", "20");
        endpoint.searchParams.set("nsfw", "true");
        endpoint.searchParams.set("licenceOneOf", [...allowedLicenceIds].join(","));
        endpoint.searchParams.set("sort", "-publishedAt");
        try {
          const payload = await fetchJson(endpoint);
          if (!payload || !Array.isArray(payload.data)) continue;

          const results = payload.data
            .filter((video) => video && typeof video.name === "string" && allowedLicenceIds.has(Number(video.licence?.id)))
            .map((video) => ({
              id: video.uuid || String(video.id),
              title: video.name,
              description: (video.description || "").slice(0, 360),
              url: video.url || (video.uuid ? new URL(`/videos/watch/${video.uuid}`, base).toString() : base.toString()),
              embedUrl: video.embedPath ? new URL(video.embedPath, base).toString() : null,
              thumbnailUrl: video.thumbnailPath ? new URL(video.thumbnailPath, base).toString() : null,
              duration: video.duration ?? null,
              views: video.views ?? null,
              licence: video.licence?.label || "Open licence (verify source details)",
              channel: video.channel?.name || "PeerTube creator",
            }));

          return NextResponse.json({ provider: "PeerTube", query, count: results.length, results });
        } catch {
          // Try the next endpoint or instance when a public instance is unavailable.
        }
      }
    }

    return NextResponse.json({
      results: [],
      error: "The open-video catalogues are temporarily unavailable. Please try again shortly.",
    }, { status: 502 });
  } catch {
    return NextResponse.json({
      results: [],
      error: "Could not reach the open-video catalogues. Please try again later.",
    }, { status: 502 });
  }
}
