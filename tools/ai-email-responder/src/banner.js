export function brandedBanner() {
  const site = process.env.WEBSITE_URL || 'https://www.downloaddash.store';
  return `
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:24px;border-collapse:collapse;">
    <tr>
      <td align="center">
        <a href="${site}" target="_blank" style="text-decoration:none;display:block;max-width:620px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;background:linear-gradient(135deg,#050008 0%,#11001f 45%,#000 100%);border:1px solid #8B5CF6;border-radius:18px;box-shadow:0 0 24px rgba(139,92,246,.45);overflow:hidden;">
            <tr>
              <td style="padding:22px 20px;text-align:center;font-family:Arial,Helvetica,sans-serif;">
                <div style="font-size:26px;line-height:1.2;font-weight:800;color:#ffffff;letter-spacing:.3px;">DownloadDash</div>
                <div style="font-size:14px;line-height:1.6;color:#ddd6fe;margin-top:8px;">Helpful guides, clear support, and responsible media-saving information in one place.</div>
                <div style="display:inline-block;margin-top:14px;padding:10px 16px;border-radius:999px;background:#8B5CF6;color:#ffffff;font-size:13px;font-weight:700;box-shadow:0 0 14px rgba(139,92,246,.65);">Visit DownloadDash</div>
              </td>
            </tr>
          </table>
        </a>
      </td>
    </tr>
  </table>`;
}

export function wrapHtmlReply({ bodyHtml, mailbox }) {
  const brand = process.env.BRAND_NAME || 'DownloadDash';
  return `<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#ffffff;color:#111827;font-family:Arial,Helvetica,sans-serif;">
    <div style="max-width:680px;margin:0 auto;padding:24px;">
      <div style="font-size:15px;line-height:1.7;color:#111827;">
        ${bodyHtml}
      </div>
      ${brandedBanner()}
      <p style="margin-top:18px;font-size:12px;line-height:1.6;color:#6b7280;">
        You received this reply from ${brand} ${mailbox ? `(${mailbox})` : ''}. If this message does not answer your request, reply to this email and a team member can review it.
      </p>
    </div>
  </body>
</html>`;
}
