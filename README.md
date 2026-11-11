# Qognix DocuFlow — starter MVP

A responsive React + TypeScript PDF study assistant with a Cloudflare Worker backend.

## Included
- Extract selectable text from PDF in the browser using PDF.js
- AI summary, 10 MCQs, ask questions, translation, AI tutor chat
- Download generated result as TXT
- 10 MB upload limit and 80,000-character text limit
- Gemini API key stays in the Worker secret, not in frontend code
- Ad placeholder (not connected to Adsterra yet)

## Requirements
- Node.js 20+
- Google AI Studio Gemini API key
- Cloudflare account (for deployed backend)

## Run frontend locally
```bash
npm install
npm run dev
```
The UI opens at the local Vite address. For local end-to-end AI calls, run the Worker separately and set `VITE_API_URL` to its URL.

## Deploy the API Worker
From the `worker` folder:
```bash
npx wrangler login
npx wrangler secret put GEMINI_API_KEY
npx wrangler deploy
```
Paste your Gemini API key when prompted. Do not put it in source code or in a VITE_ variable.

After deploy, copy the Worker URL. Create a `.env` file in the project root:
```env
VITE_API_URL=https://YOUR-WORKER.YOUR-SUBDOMAIN.workers.dev
```
Then build the frontend:
```bash
npm run build
```

## Deploy the frontend
Push this folder to a GitHub repository, then connect the repository to Cloudflare Pages:
- Build command: `npm run build`
- Build output directory: `dist`
- Add environment variable `VITE_API_URL` with your deployed Worker URL.
Redeploy after changing environment variables.

## Important before public launch
1. This is a starter MVP, not a production-ready service.
2. Add rate limiting, abuse protection, request-size controls, and usage quotas to the Worker before opening it to the public. CORS is not authentication.
3. Add Privacy Policy, Terms, Contact and About pages. Explain that extracted document text is sent to Google Gemini when AI is used.
4. Do not upload confidential or sensitive PDFs to an AI service unless you have reviewed its current data-use terms.
5. Scanned/image-only PDFs are not supported yet (OCR not included).
6. This starter does not store uploaded PDFs permanently.
7. Adsterra is only represented by a placeholder. Add the approved ad code only after the site is reviewed and accepted by the ad network.
8. Free API quotas and provider model availability can change. Check current Gemini API documentation and pricing before launch.
9. The Worker currently allows cross-origin requests. Restrict origins and add rate limiting before production.

## Current limits
- PDF max size: 10 MB
- Extracted text sent to model: up to 80,000 characters
- AI response: up to 4,096 output tokens
