---
title: Brainrot Studio Free Video Worker
emoji: 🎬
colorFrom: purple
colorTo: pink
sdk: gradio
sdk_version: 6.27.0
app_file: app.py
pinned: false
---

# Brainrot Studio — Free ZeroGPU Video Worker

This Space is an optional free GPU worker for Brainrot Studio. It uses LTX-Video through a Gradio API and is designed for short image-to-video clips.

## Free-use rules

- Hugging Face ZeroGPU has account quotas; it is not unlimited.
- Do not rotate accounts or bypass quotas.
- Keep clips short and queue work when the Space is unavailable.
- The production app should treat this as an opportunistic provider, not guaranteed capacity.

## Setup

1. Create a Hugging Face Space with **ZeroGPU** hardware.
2. Copy `app.py` and `requirements.txt` from this folder into the Space.
3. Wait for the Space to build.
4. Set `HUGGINGFACE_ZERO_GPU_URL` in Brainrot Studio to the Space URL.
5. If the Space is private, set `HUGGINGFACE_TOKEN` only on the Brainrot Studio server.

The API endpoint is `/generate_video` and returns a generated MP4 path/URL through the Gradio API.

## Model choice

The worker uses the smaller LTX-Video pipeline rather than a very large model so it is practical on shared free GPU hardware. LTX-Video supports image-to-video generation and the official documentation describes memory-saving/offload techniques.
