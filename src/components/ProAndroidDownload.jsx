import { useState } from "react";
import "./pro-android-download.css";
import { startApkDownload } from "@/utils/apkDownload";

export default function ProAndroidDownload() {
  const [status, setStatus] = useState("");
  const [checking, setChecking] = useState(false);

  const isAndroid = /Android/i.test(navigator.userAgent);
  const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);

  async function downloadApk() {
    setChecking(true);
    setStatus("Preparing your DownloadDash app download...");

    const result = await startApkDownload();
    setStatus(result.message);
    setChecking(false);
  }

  return (
    <section className="pro-apk-section">
      <div className="pro-apk-card">
        <div className="pro-apk-icon">APK</div>

        <p className="pro-apk-eyebrow">DownloadDash Android</p>

        <h1>Install the DownloadDash App</h1>

        <p className="pro-apk-copy">
          Get a cleaner mobile experience for public-link workflows, saved collections,
          and faster access from your Android device.
        </p>

        <div className="pro-apk-grid">
          <div>Real Android APK</div>
          <div>Mobile dashboard</div>
          <div>Saved collections</div>
          <div>Public-link focused</div>
        </div>

        {isIOS ? (
          <div className="pro-apk-ios">
            <h2>iPhone & iPad</h2>
            <p>
              iPhone and iPad do not install APK files. Open DownloadDash in Safari,
              tap Share, then choose Add to Home Screen.
            </p>
          </div>
        ) : (
          <button className="pro-apk-button" onClick={downloadApk} disabled={checking}>
            {checking ? "Checking App..." : "Download Android APK"}
          </button>
        )}

        {status && <p className="pro-apk-status">{status}</p>}

        <div className="pro-apk-steps">
          <h2>How to install</h2>
          <ol>
            <li>Tap Download Android APK.</li>
            <li>Wait for the APK file to finish downloading.</li>
            <li>Open the downloaded file.</li>
            <li>Allow installation when Android asks for permission.</li>
            <li>Open DownloadDash from your app screen.</li>
          </ol>
        </div>

        <p className="pro-apk-note">
          DownloadDash is designed for supported public links and transparent media workflows.
        </p>
      </div>
    </section>
  );
}
