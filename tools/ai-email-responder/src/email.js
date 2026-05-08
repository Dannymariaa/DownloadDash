import { ImapFlow } from 'imapflow';
import { simpleParser } from 'mailparser';
import nodemailer from 'nodemailer';

export function mailboxConfigs() {
  return [
    { address: process.env.SUPPORT_EMAIL, user: process.env.SUPPORT_USER, pass: process.env.SUPPORT_PASS },
    { address: process.env.INFO_EMAIL, user: process.env.INFO_USER, pass: process.env.INFO_PASS },
    { address: process.env.LEGAL_EMAIL, user: process.env.LEGAL_USER, pass: process.env.LEGAL_PASS }
  ].filter(x => x.address && x.user && x.pass && !x.pass.includes('your_'));
}

export function smtpTransportFor(config) {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 465),
    secure: String(process.env.SMTP_SECURE).toLowerCase() !== 'false',
    auth: { user: config.user, pass: config.pass }
  });
}

export async function fetchUnread(config) {
  const client = new ImapFlow({
    host: process.env.IMAP_HOST,
    port: Number(process.env.IMAP_PORT || 993),
    secure: String(process.env.IMAP_SECURE).toLowerCase() !== 'false',
    auth: { user: config.user, pass: config.pass },
    logger: false
  });
  await client.connect();
  const lock = await client.getMailboxLock('INBOX');
  try {
    const messages = [];
    for await (const msg of client.fetch({ seen: false }, { source: true, envelope: true, uid: true })) {
      const parsed = await simpleParser(msg.source);
      messages.push({
        uid: msg.uid,
        messageId: parsed.messageId,
        from: parsed.from?.text || '',
        to: parsed.to?.text || '',
        subject: parsed.subject || '(No subject)',
        text: parsed.text || parsed.html?.replace(/<[^>]+>/g, ' ') || '',
        date: parsed.date,
        inReplyTo: parsed.inReplyTo,
        references: parsed.references
      });
    }
    return { client, lock, messages };
  } catch (error) {
    lock.release();
    await client.logout();
    throw error;
  }
}

export async function markSeen(client, uid) {
  await client.messageFlagsAdd(uid, ['\\Seen'], { uid: true });
}

export async function closeMailbox(client, lock) {
  lock.release();
  await client.logout();
}

export async function sendReply({ config, original, html, text }) {
  const transporter = smtpTransportFor(config);
  await transporter.sendMail({
    from: `DownloadDash <${config.address}>`,
    to: original.from,
    subject: original.subject?.toLowerCase().startsWith('re:') ? original.subject : `Re: ${original.subject}`,
    html,
    text,
    inReplyTo: original.messageId,
    references: original.references || original.messageId
  });
}

export async function forwardForReview({ config, original, analysis, draftText }) {
  const reviewer = process.env.HUMAN_REVIEW_EMAIL;
  if (!reviewer) return false;
  const transporter = smtpTransportFor(config);
  await transporter.sendMail({
    from: `DownloadDash Review Bot <${config.address}>`,
    to: reviewer,
    subject: `[Review Needed] ${original.subject}`,
    text: `A message needs human review.\n\nFrom: ${original.from}\nMailbox: ${config.address}\nReason: ${analysis.riskReason || analysis.intent}\n\nSummary: ${analysis.summary}\n\nSuggested reply:\n${draftText}\n\nOriginal email:\n${original.text}`
  });
  return true;
}
