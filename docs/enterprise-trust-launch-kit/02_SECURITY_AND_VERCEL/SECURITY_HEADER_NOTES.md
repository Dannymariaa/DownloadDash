# Security Header Notes

This config is designed for a React/Vite app hosted on Vercel.

## It Adds

- Clickjacking protection
- MIME sniffing protection
- HTTPS enforcement
- Privacy-friendly referrer rules
- Strong browser permission restrictions
- Safer content loading rules
- Better cache rules for static assets

## If Something Breaks

If a feature stops working, open Chrome DevTools Console.

Look for messages like:

"Refused to connect to..."
"Refused to load script..."
"Refused to load image..."

Then add the trusted domain to the correct Content Security Policy section.

Do not randomly add `*` to everything unless you are testing, because that weakens the policy.
