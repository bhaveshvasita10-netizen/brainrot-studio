# Brainrot Studio AI

Production-oriented Next.js starter for an original surreal kids-cartoon generation platform.

## Current foundation
- Next.js + TypeScript
- Supabase Auth + PostgreSQL + RLS
- Programmatic 100,000-character combinatorial library
- Authenticated character library
- Favorite characters
- Private storage buckets scaffolded in Supabase
- Random character API

## Local setup
```bash
npm install
npm run dev
```

Then open `http://localhost:3000`.

## Supabase
The app uses `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
Keep service-role/secret keys server-side only.

For magic-link auth, add your deployed URL to Supabase Auth redirect URLs.

## Production integrations still requiring credentials
- AI image generation provider
- AI video generation provider
- TTS/voice provider
- YouTube OAuth client credentials
- Production domain

These integrations are kept separate from the core database model so vendors can be changed later.
