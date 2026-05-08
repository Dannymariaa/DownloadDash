# DownloadDash AI Email Responder Pro

This upgraded version reads incoming emails, analyzes the message, identifies the sender's name and intent, decides whether the email is safe to answer automatically, then writes a polished human-style reply with a clickable purple/black/white DownloadDash banner.

## What makes this version better

- Reads and cleans the incoming email before answering.
- Classifies the email intent: support, info, legal, copyright, privacy, abuse, bug report, partnership, spam, and more.
- Extracts the sender's name when possible.
- Uses a two-step AI process:
  1. Analyze and think.
  2. Write the best reply based on the analysis.
- Keeps legal/copyright/privacy/abuse messages in review mode by default.
- Adds a professional clickable DownloadDash banner to every HTML reply.
- Prevents repeated spam replies with blocklist and daily reply limit.
- Supports support@, info@, and legal@ mailboxes.

## Quick start

1. Open this folder in VS Code.
2. Run:

```bash
npm install
```

3. Copy `.env.example` and rename the copy to `.env`.
4. Fill your mailbox passwords and OpenAI API key.
5. Test settings:

```bash
npm run check
```

6. Run once for testing:

```bash
npm run once
```

7. Run continuously:

```bash
npm start
```

## Safety recommendation

Keep this setting:

```env
AUTO_SEND_LEGAL=false
```

Legal, copyright, privacy, abuse, refund, or threatening emails should be reviewed by a real person first.

## Namecheap Private Email settings

Use these unless Namecheap shows different values in your account:

```env
IMAP_HOST=mail.privateemail.com
IMAP_PORT=993
IMAP_SECURE=true
SMTP_HOST=mail.privateemail.com
SMTP_PORT=465
SMTP_SECURE=true
```

## Important

Do not put your real passwords inside `.env.example`. Put them only inside `.env`, and never upload `.env` to GitHub.
