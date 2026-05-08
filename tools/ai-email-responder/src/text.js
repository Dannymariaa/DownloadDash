export function htmlEscape(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

export function paragraphsToHtml(text = '') {
  return text
    .split(/\n{2,}/)
    .map(p => p.trim())
    .filter(Boolean)
    .map(p => `<p style="margin:0 0 14px 0;">${htmlEscape(p).replace(/\n/g, '<br>')}</p>`)
    .join('\n');
}

export function getSenderName(from = '') {
  const match = from.match(/^\s*"?([^"<]+)"?\s*</);
  const name = match?.[1]?.trim();
  if (name && !name.includes('@')) return name.split(/\s+/)[0];
  const email = from.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0] || '';
  const local = email.split('@')[0] || '';
  if (!local) return '';
  const cleaned = local.replace(/[._-]+/g, ' ').replace(/\d+/g, '').trim();
  return cleaned ? cleaned.split(/\s+/)[0].replace(/^./, c => c.toUpperCase()) : '';
}

export function getEmailAddress(from = '') {
  return from.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0] || '';
}

export function cleanEmailText(text = '') {
  return text
    .replace(/On .* wrote:[\s\S]*/i, '')
    .replace(/From:.*\nSent:.*\nTo:.*\nSubject:.*/gis, '')
    .replace(/-{2,}\s*Original Message\s*-{2,}[\s\S]*/i, '')
    .trim()
    .slice(0, 12000);
}
