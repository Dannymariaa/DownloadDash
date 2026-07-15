// components/DownloadExample.jsx
import { useState } from "react";
import downloadDash from "../utils/downloadDash";

export default function DownloadExample() {
  const [url, setUrl] = useState("");
  const [platform, setPlatform] = useState("youtube");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const handleDownload = async () => {
    if (!url) {
      setError("Please enter a URL");
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const data = await downloadDash.download(platform, { url: url });
      setResult(data);
      console.log("Download result:", data);
    } catch (err) {
      setError(err.message);
      console.error("Download error:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: "600px", margin: "50px auto", padding: "20px" }}>
      <h1>DownloadDash</h1>
      <div style={{ marginBottom: "15px" }}>
        <label>Platform:</label>
        <select value={platform} onChange={(e) => setPlatform(e.target.value)} style={{ marginLeft: "10px", padding: "5px" }}>
          <option value="youtube">YouTube</option>
          <option value="instagram">Instagram</option>
          <option value="tiktok">TikTok</option>
          <option value="facebook">Facebook</option>
          <option value="pinterest">Pinterest</option>
          <option value="reddit">Reddit</option>
          <option value="x">X (Twitter)</option>
        </select>
      </div>
      <div style={{ display: "flex", gap: "10px" }}>
        <input type="text" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="Enter video/photo URL" style={{ flex: 1, padding: "10px", border: "1px solid #ddd", borderRadius: "4px" }} />
        <button onClick={handleDownload} disabled={loading} style={{ padding: "10px 20px", background: "#0070f3", color: "white", border: "none", borderRadius: "4px", cursor: "pointer" }}>
          {loading ? "Loading..." : "Download"}
        </button>
      </div>
      {error && <div style={{ marginTop: "20px", padding: "10px", background: "#fee", color: "#c00", borderRadius: "4px" }}>Error: {error}</div>}
      {result && (
        <div style={{ marginTop: "20px", padding: "15px", background: "#f0f7ff", borderRadius: "4px" }}>
          <h3>Success!</h3>
          <p><strong>Title:</strong> {result.title}</p>
          <p><strong>Platform:</strong> {result.platform}</p>
          <p><strong>Type:</strong> {result.type}</p>
          <div style={{ marginTop: "10px" }}>
            <strong>Download URLs:</strong>
            <ul>
              {result.downloads.videoHD && <li>Video HD: <a href={result.downloads.videoHD} target="_blank">Download</a></li>}
              {result.downloads.videoSD && <li>Video SD: <a href={result.downloads.videoSD} target="_blank">Download</a></li>}
              {result.downloads.audio && <li>Audio: <a href={result.downloads.audio} target="_blank">Download</a></li>}
              {result.downloads.image && <li>Image: <a href={result.downloads.image} target="_blank">Download</a></li>}
            </ul>
          </div>
          <p><strong>Primary URL:</strong> <a href={result.primaryUrl} target="_blank">{result.primaryUrl}</a></p>
        </div>
      )}
    </div>
  );
}
