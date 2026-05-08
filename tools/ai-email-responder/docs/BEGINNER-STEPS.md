# Beginner Setup Steps

## 1. Create your mailboxes in Namecheap

Create these mailboxes:

- support@downloaddash.store
- info@downloaddash.store
- legal@downloaddash.store

## 2. Download and open this project

Unzip the file, then open the folder in VS Code.

## 3. Install Node.js

If Node.js is not installed, install it from nodejs.org. Choose the LTS version.

## 4. Install the project packages

In VS Code Terminal, run:

```bash
npm install
```

## 5. Create your .env file

Copy `.env.example` and rename the copy to `.env`.

Fill:

- OPENAI_API_KEY
- SUPPORT_PASS
- INFO_PASS
- LEGAL_PASS
- HUMAN_REVIEW_EMAIL if you want risky messages forwarded to your Gmail first

## 6. Test the config

Run:

```bash
npm run check
```

## 7. Send yourself a test email

Send an email to support@downloaddash.store from another email account.

Example:

Subject: Help with DownloadDash
Message: Hi, I want to know how DownloadDash works.

## 8. Test one-time run

Run:

```bash
npm run once
```

If everything is correct, the bot will read the unread email and respond.

## 9. Turn on continuous running

Run:

```bash
npm start
```

Keep the computer/server running if you want the bot to keep replying.

## 10. Best professional setting

Use automatic replies only for support and info:

```env
AUTO_SEND_SUPPORT=true
AUTO_SEND_INFO=true
AUTO_SEND_LEGAL=false
```

Legal emails should be reviewed first.
