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
- Local GPU worker integration for heavy video rendering

## Environment
See `.env.local.example`. Never expose server secrets as `NEXT_PUBLIC_*` values and never commit `.env.local`.

## Production requirements
1. Add Supabase public + service-role credentials to Vercel.
2. Add an AI provider key (the current routes use an OpenAI-compatible API).
3. Create a Google OAuth client with the YouTube Data API enabled and set `YOUTUBE_CLIENT_ID`, `YOUTUBE_CLIENT_SECRET`, and `YOUTUBE_REDIRECT_URI`.
4. Add a 32-byte `YOUTUBE_TOKEN_ENCRYPTION_KEY` and `CRON_SECRET` in Vercel.
5. Add the deployed site URL to the Supabase Auth redirect allow-list and the Google OAuth redirect allow-list.

## Local GPU rendering
Heavy AI video rendering can run on a local Windows/NVIDIA laptop instead of inside a Vercel request. The worker is in `worker/local-gpu` and talks to a local ComfyUI instance. Start with its README.

The worker is designed for consumer GPUs, but the standard Wan2.2 TI2V-5B documentation lists 24 GB VRAM as the normal minimum. An RTX 5060 Laptop with 8 GB therefore needs a VRAM-optimized/quantized/offload workflow or another model that fits; the repository does not claim the stock Wan2.2 workflow will fit 8 GB.

The local worker provides a durable queue boundary, polling, cancellation, timeout handling, and ComfyUI job tracking. It does not store provider secrets.

## Video architecture

`Vercel UI -> render job -> local GPU worker -> ComfyUI/video model -> FFmpeg -> Supabase -> YouTube`

Short drafts can still be rendered in the browser for quick previews. Heavy production renders should use the local worker so Vercel is not responsible for GPU work.

## Original-IP guardrails
Prompts explicitly request original characters and avoid existing copyrighted characters, logos, celebrity likenesses, songs, or catchphrases.

## QA
The GitHub Actions stress workflow exercises millions of deterministic media-pipeline combinations. It validates configuration/invariants only. A real 3,000-video AI-render benchmark must execute on the physical GPU worker and will take substantial time, storage, heat, and power; it cannot be truthfully replaced by a deterministic loop.
