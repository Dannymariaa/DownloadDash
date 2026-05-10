export const APK_URL = "/downloads/DownloadDash.apk";
export const MIN_APK_BYTES = 1024 * 1024;

export async function checkApkAvailability() {
  try {
    const response = await fetch(APK_URL, {
      method: "HEAD",
      cache: "no-store",
    });

    const contentType = response.headers.get("content-type") || "";
    const size = Number(response.headers.get("content-length") || 0);
    const isApk =
      contentType.includes("application/vnd.android.package-archive") ||
      contentType.includes("application/octet-stream");

    return {
      available: response.ok && isApk && size >= MIN_APK_BYTES,
      status: response.status,
      size,
    };
  } catch {
    return {
      available: false,
      status: 0,
      size: 0,
    };
  }
}

export async function startApkDownload() {
  const check = await checkApkAvailability();

  if (!check.available) {
    return {
      ok: false,
      message:
        "The Android app is being prepared. Please try again later or use Add to Home Screen for now.",
    };
  }

  const link = document.createElement("a");
  link.href = APK_URL;
  link.download = "DownloadDash.apk";
  link.rel = "noopener";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  return {
    ok: true,
    message: "Download started. Open the APK after it finishes downloading to install DownloadDash.",
  };
}
