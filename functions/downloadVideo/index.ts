// @ts-nocheck

Deno.serve(async (req) => {
  try {
    const { url, platform, quality, extractAudio } = await req.json();

    if (!url) {
      return Response.json({ error: "URL is required" }, { status: 400 });
    }

    const apiBaseUrlRaw =
      Deno.env.get("SMD_API_BASE_URL") ||
      Deno.env.get("SOCIAL_DOWNLOADER_API_BASE_URL") ||
      "http://127.0.0.1:8000";
    const apiBaseUrl = apiBaseUrlRaw.replace(/\/+$/, "");
    const apiKey = Deno.env.get("SMD_API_KEY") || Deno.env.get("SOCIAL_DOWNLOADER_API_KEY") || "";

    const upstreamRes = await fetch(`${apiBaseUrl}/download`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(apiKey ? { "X-API-Key": apiKey } : {}),
      },
      body: JSON.stringify({
        url,
        platform,
        quality: quality || "highest",
        extract_audio: !!extractAudio,
        include_metadata: true,
      }),
    });

    const upstreamData = await upstreamRes.json().catch(() => null);

    if (!upstreamRes.ok) {
      return Response.json(
        {
          error: upstreamData?.detail || upstreamData?.error || "Failed to resolve media",
          details: upstreamData,
        },
        { status: upstreamRes.status },
      );
    }

    const downloadUrl = upstreamData?.download_url || upstreamData?.media_info?.download_url;
    const thumbnail =
      upstreamData?.media_info?.thumbnail_url || upstreamData?.media_info?.preview_url || upstreamData?.thumbnail;
    const title = upstreamData?.media_info?.title || upstreamData?.title || "Media";
    const fallbackDownloads = extractAudio
      ? (downloadUrl ? { audio: downloadUrl } : {})
      : (downloadUrl ? { videoHD: downloadUrl } : {});

    const downloads = {
      ...(upstreamData?.downloads || {}),
      // Fallbacks if upstream didn't provide a downloads map
      ...fallbackDownloads,
      ...(thumbnail ? { image: upstreamData?.downloads?.image || thumbnail } : {}),
    };

    const upstreamType = upstreamData?.media_info?.media_type || upstreamData?.kind;
    const mediaType =
      extractAudio
        ? "audio"
        : (upstreamType ||
          ((downloads.image && !downloads.videoHD && !downloads.videoSD) ? "image" : "video"));

    return Response.json({
      success: true,
      title,
      thumbnail,
      platform: upstreamData?.media_info?.platform || platform || "unknown",
      type: mediaType,
      downloads,
      raw: upstreamData,
    });
  } catch (error) {
    console.error("Download error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
