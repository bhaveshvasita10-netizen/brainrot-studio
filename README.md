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
- Free Hugging Face ZeroGPU video-worker adapter using LTX-Video

## Environment
See `.env.local.example`. Never expose server secrets as `NEXT_PUBLIC_*` values and never commit `.env.local`.

For free AI video mode, configure:
- `HUGGINGFACE_ZERO_GPU_URL` — your ZeroGPU Space URL
- `HUGGINGFACE_TOKEN` — optional server-only HF token; keep it private

The endpoint `/api/video/free` submits a short image-to-video job to the Space and waits for the Gradio result.

## Production requirements
1. Add Supabase public + service-role credentials to Vercel.
2. Add an AI provider key (the current routes use an OpenAI-compatible API).
3. Create a Google OAuth client with the YouTube Data API enabled and set `YOUTUBE_CLIENT_ID`, `YOUTUBE_CLIENT_SECRET`, and `YOUTUBE_REDIRECT_URI`.
4. Add a 32-byte `YOUTUBE_TOKEN_ENCRYPTION_KEY` and `CRON_SECRET` in Vercel.
5. Add the deployed site URL to the Supabase Auth redirect allow-list and the Google OAuth redirect allow-list.

## Free AI video worker
The starter Space is in `worker/providers/huggingface`.

1. Create a Hugging Face Space with ZeroGPU hardware.
2. Copy `app.py` and `requirements.txt` into that Space.
3. Wait for the Space to build.
4. Put the Space URL in `HUGGINGFACE_ZERO_GPU_URL`.
5. If the Space is private, put a read token in `HUGGINGFACE_TOKEN` on the server only.

The worker intentionally limits generation to short 2–4 second clips. Longer Brainrot episodes should be assembled from multiple short scenes and rendered/encoded with FFmpeg. Free hosted GPU capacity is opportunistic and must not be treated as unlimited.

## Local GPU rendering
Heavy AI video rendering can also run on a local Windows/NVIDIA laptop instead of inside a Vercel request. The worker is in `worker/local-gpu` and talks to a local ComfyUI instance. Start with its README.

The worker is designed for consumer GPUs, but large video models can exceed an RTX 5060 Laptop's 8 GB VRAM. Use a VRAM-optimized/quantized/offload workflow or another model that fits; the repository does not claim that a stock large-model workflow will fit 8 GB.

## Video architecture

`Vercel UI -> render job -> free/local GPU worker -> video model -> FFmpeg -> Supabase -> YouTube`

Short drafts can still be rendered in the browser for quick previews. Heavy production renders should use a GPU worker so Vercel is not responsible for GPU work.

## Original-IP guardrails
Prompts explicitly request original characters and avoid existing copyrighted characters, logos, celebrity likenesses, songs, or catchphrases.

## QA
The GitHub Actions stress workflow exercises deterministic media-pipeline combinations. It validates configuration/invariants only. A real 3,000-video AI-render benchmark must execute on an actual GPU worker and will take substantial time, storage, heat, and power; it cannot be truthfully replaced by a deterministic loop.

## Soul companion experience
The main app is branded as **Soul** and includes discovery, companion creation, persistent conversations, memory-aware chat, and an adult-only setting limited to non-graphic romance/affection. The production UI is deployed from the `main` branch through Vercel.
