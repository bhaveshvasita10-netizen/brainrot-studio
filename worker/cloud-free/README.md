# Free online GPU options

Brainrot Studio can use online GPU sources when the laptop is offline. This folder documents the provider adapter strategy.

## Providers

### Hugging Face ZeroGPU
- Free accounts currently receive a small daily GPU quota.
- Free personal accounts can host up to two ZeroGPU Spaces when eligible.
- ZeroGPU is shared infrastructure, so it is not an unlimited production renderer.
- Best use: prototypes, smoke tests, and small batches.

### Google Colab
- Free GPU access is dynamic and not guaranteed.
- Sessions can terminate and GPU availability varies.
- Best use: temporary batch rendering and model experiments.

### Kaggle
- Free notebook GPU access is quota-based.
- Best use: scheduled/experimental batch runs where the notebook can be restarted.

## Architecture

Keep Vercel as the control plane and Supabase as the job/state store. A cloud worker polls a signed job endpoint, renders with ComfyUI/model runtime, uploads the resulting MP4 to Supabase, and reports completion.

The worker API is provider-neutral so the same queue can switch between local RTX 5060, Hugging Face, Colab, Kaggle, or a paid GPU later.

## Important

No credible free hosted service currently provides unlimited AI-video GPU rendering. The application therefore uses a fallback chain rather than promising unlimited free compute.
