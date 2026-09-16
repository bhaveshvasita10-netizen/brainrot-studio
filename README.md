# Brainrot Studio AI

A production-oriented Next.js + Supabase studio for creating original, kid-friendly surreal cartoon shorts.

## Included
- Supabase magic-link authentication and private per-user libraries
- Original character randomizer
- AI story + scene generation
- AI character image generation
- AI narration generation
- Browser-side short-video renderer with vertical 720x1280 output
- Private Supabase Storage for character art, videos, and thumbnails
- YouTube OAuth connection
- Resumable-style YouTube upload endpoint
- Scheduled YouTube upload queue checked by Vercel Cron
- Server-side OAuth token encryption

## Environment
See `.env.local.example`. Never expose server secrets as `NEXT_PUBLIC_*` values and never commit `.env.local`.

## Production requirements
1. Add Supabase public + service-role credentials to Vercel.
2. Add an AI provider key (the current routes use an OpenAI-compatible API).
3. Create a Google OAuth client with the YouTube Data API enabled and set `YOUTUBE_CLIENT_ID`, `YOUTUBE_CLIENT_SECRET`, and `YOUTUBE_REDIRECT_URI`.
4. Add a 32-byte `YOUTUBE_TOKEN_ENCRYPTION_KEY` and `CRON_SECRET` in Vercel.
5. Add the deployed site URL to the Supabase Auth redirect allow-list and the Google OAuth redirect allow-list.

## Video architecture
Short drafts are rendered in the browser so users can test the full workflow without a long-running server request. For longer or heavier production renders, move rendering into a durable FFmpeg/video worker and keep only job orchestration in Vercel.

## Original-IP guardrails
Prompts explicitly request original characters and avoid existing copyrighted characters, logos, celebrity likenesses, songs, or catchphrases.
