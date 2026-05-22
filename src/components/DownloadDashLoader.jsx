export default function DownloadDashLoader({ text = 'Loading DownloadDash...' }) {
  return (
    <div className="dd-loader-screen" role="status" aria-live="polite" aria-label={text}>
      <div className="dd-loader-wrap">
        <div className="dd-loader-ring" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>

        <div className="dd-loader-pulse" aria-hidden="true">
          <div className="dd-loader-arrow">&darr;</div>
        </div>

        <p className="dd-loader-title">DownloadDash</p>
        <p className="dd-loader-text">{text}</p>
      </div>
    </div>
  );
}
