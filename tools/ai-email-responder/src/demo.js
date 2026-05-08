import 'dotenv/config';
import { analysisPrompt, replyPrompt } from './prompts.js';
import { askJson, askText } from './openai-client.js';
import { paragraphsToHtml } from './text.js';
import { wrapHtmlReply } from './banner.js';

const sample = {
  mailbox: process.env.SUPPORT_EMAIL || 'support@downloaddash.store',
  from: 'Maria Example <maria@example.com>',
  subject: 'I cannot find the TikTok guide',
  body: 'Hi, I searched your website but I cannot find the TikTok guide. Can you help me?'
};

const analysis = await askJson(analysisPrompt(sample));
const reply = await askText(replyPrompt({ ...sample, analysis }));
console.log('ANALYSIS:', analysis);
console.log('\nREPLY TEXT:\n', reply);
console.log('\nHTML PREVIEW:\n', wrapHtmlReply({ bodyHtml: paragraphsToHtml(reply), mailbox: sample.mailbox }));
