import 'dotenv/config';

const required = ['OPENAI_API_KEY','IMAP_HOST','SMTP_HOST','SUPPORT_EMAIL','SUPPORT_USER','SUPPORT_PASS'];
const missing = required.filter(k => !process.env[k] || process.env[k].includes('your_'));

if (missing.length) {
  console.error('Missing or incomplete settings:', missing.join(', '));
  console.error('Open .env and fill these values before running the bot.');
  process.exit(1);
}
console.log('Basic config looks ready.');
console.log('Tip: keep AUTO_SEND_LEGAL=false unless a real person reviews legal messages first.');
