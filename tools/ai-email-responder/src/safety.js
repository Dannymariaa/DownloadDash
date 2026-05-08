import { getEmailAddress } from './text.js';

const dailyReplyCount = new Map();

export function isBlockedSender(from = '') {
  const sender = getEmailAddress(from).toLowerCase();
  const blocklist = (process.env.BLOCKLIST || '')
    .split(',')
    .map(x => x.trim().toLowerCase())
    .filter(Boolean);
  return blocklist.some(item => sender.includes(item) || from.toLowerCase().includes(item));
}

export function tooManyReplies(from = '') {
  const sender = getEmailAddress(from).toLowerCase();
  if (!sender) return false;
  const max = Number(process.env.MAX_REPLIES_PER_SENDER_PER_DAY || 3);
  const day = new Date().toISOString().slice(0, 10);
  const key = `${day}:${sender}`;
  const count = dailyReplyCount.get(key) || 0;
  if (count >= max) return true;
  dailyReplyCount.set(key, count + 1);
  return false;
}

export function mailboxAutoSendAllowed(mailbox) {
  if (mailbox === process.env.LEGAL_EMAIL) return String(process.env.AUTO_SEND_LEGAL).toLowerCase() === 'true';
  if (mailbox === process.env.INFO_EMAIL) return String(process.env.AUTO_SEND_INFO).toLowerCase() === 'true';
  return String(process.env.AUTO_SEND_SUPPORT).toLowerCase() === 'true';
}

export function mustHumanReview(analysis) {
  const risky = ['legal','copyright','privacy','abuse','refund'];
  return analysis.needsHumanReview || risky.includes(analysis.intent) || analysis.sentiment === 'threatening';
}
