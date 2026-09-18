# Soul — AI Companion App

Soul is a clean Next.js AI companion experience built around discovery, creation and natural conversation.

## What is included

- Soul-style responsive web UI
- Home, Discover, Messages, Create Soul, Library and Profile sections
- Search and personality filters
- Original built-in companions
- Create your own companion with personality and backstory
- Favorites and personal library
- Persistent demo conversations in browser local storage
- Browser text-to-speech controls
- Optional live AI chat through an OpenAI-compatible API
- 18+ setting for romantic/affectionate, mature **non-graphic** conversation only
- Server-side safety filtering for minor/explicit-sexual requests
- Mobile bottom navigation and desktop sidebar

## Run

```bash
npm install
npm run dev
```

## Live AI

Set these Vercel environment variables:

- `OPENAI_API_KEY`
- optional `OPENAI_BASE_URL`
- optional `OPENAI_CHAT_MODEL`

Without an AI key, the app still works using deterministic demo replies, so the interface can be tested immediately.

## Important production step

The current starter stores demo conversations and custom souls in browser local storage. For a production multi-user service, add authentication plus a database/storage layer before collecting real user information.

## Content boundaries

Soul supports adult romance, affection and mature non-graphic roleplay between adults. It does not generate graphic sexual content or sexual content involving minors.

## Deployment

The repository is designed for Vercel + Next.js. With Git integration connected, pushing the production branch creates a new deployment. Verify the newest deployment before testing the production URL.
