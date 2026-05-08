import 'dotenv/config';
import { analysisPrompt, replyPrompt } from './prompts.js';
import { askJson, askText } from './openai-client.js';
import { cleanEmailText, paragraphsToHtml } from './text.js';
import { wrapHtmlReply } from './banner.js';
import { fetchUnread, closeMailbox, markSeen, sendReply, forwardForReview, mailboxConfigs } from './email.js';
import { isBlockedSender, tooManyReplies, mailboxAutoSendAllowed, mustHumanReview } from './safety.js';

async function handleMessage(config, message) {
  const body = cleanEmailText(message.text);
  if (!body) return console.log('Skipped empty message:', message.subject);
  if (isBlockedSender(message.from)) return console.log('Blocked/no-reply sender skipped:', message.from);
  if (tooManyReplies(message.from)) return console.log('Daily reply limit reached for:', message.from);

  console.log(`\nAnalyzing email for ${config.address}: ${message.subject}`);
  const analysis = await askJson(analysisPrompt({ mailbox: config.address, from: message.from, subject: message.subject, body }));
  console.log('Intent:', analysis.intent, '| Review:', analysis.needsHumanReview, '| Summary:', analysis.summary);

  if (!analysis.shouldAutoReply) {
    console.log('AI decided not to reply automatically.');
    return;
  }

  const replyText = await askText(replyPrompt({ mailbox: config.address, from: message.from, subject: message.subject, body, analysis }));
  const html = wrapHtmlReply({ bodyHtml: paragraphsToHtml(replyText), mailbox: config.address });

  const needsReview = mustHumanReview(analysis) || !mailboxAutoSendAllowed(config.address);
  if (needsReview) {
    const forwarded = await forwardForReview({ config, original: message, analysis, draftText: replyText });
    console.log(forwarded ? 'Forwarded suggested reply for human review.' : 'Review needed. Suggested reply below:\n' + replyText);
    return;
  }

  await sendReply({ config, original: message, html, text: replyText });
  console.log('Reply sent to:', message.from);
}

async function runOnce() {
  const configs = mailboxConfigs();
  if (!configs.length) throw new Error('No complete mailbox configs found. Fill .env first.');

  for (const config of configs) {
    const { client, lock, messages } = await fetchUnread(config);
    try {
      console.log(`${config.address}: ${messages.length} unread message(s).`);
      for (const message of messages) {
        try {
          await handleMessage(config, message);
          await markSeen(client, message.uid);
        } catch (error) {
          console.error('Failed message:', message.subject, error.message);
        }
      }
    } finally {
      await closeMailbox(client, lock);
    }
  }
}

async function main() {
  const interval = Number(process.env.CHECK_INTERVAL_SECONDS || 60) * 1000;
  const runOnceOnly = process.argv.includes('--once') || String(process.env.RUN_ONCE).toLowerCase() === 'true';
  await runOnce();
  if (runOnceOnly) return;
  setInterval(() => runOnce().catch(err => console.error('Loop error:', err.message)), interval);
}

main().catch(error => {
  console.error('Fatal error:', error.message);
  process.exit(1);
});
