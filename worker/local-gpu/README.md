# Brainrot Studio Local GPU Worker

This worker lets an ASUS/Windows laptop act as the private GPU renderer for Brainrot Studio.

## Architecture

`Brainrot Studio (Vercel) -> Local GPU Worker -> ComfyUI -> MP4 -> Brainrot Studio`

The worker does **not** contain API keys and does not expose Supabase service-role credentials. It only talks to a local ComfyUI instance and exposes a small localhost HTTP API.

## Hardware target

Designed for consumer GPUs, including an RTX 5060 Laptop with 8 GB VRAM. The actual model/workflow must fit the available VRAM. Official Wan2.2 TI2V-5B documentation lists 24 GB as the normal minimum, so an 8 GB machine requires a VRAM-optimized workflow or alternative quantized/offload implementation; do not assume the standard Wan2.2 workflow will fit. See the upstream Wan2.2 documentation before downloading weights.

## Prerequisites on Windows

1. Install NVIDIA drivers.
2. Install Python 3.11+.
3. Install FFmpeg and make sure `ffmpeg` is on PATH.
4. Install/run ComfyUI locally.
5. Configure an image-to-video workflow in ComfyUI that accepts an input image and prompt and writes an MP4.
6. Copy `.env.example` to `.env` and set `COMFYUI_URL` if ComfyUI is not on `http://127.0.0.1:8188`.
7. Install worker dependencies:

```powershell
cd worker/local-gpu
py -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

8. Start the worker:

```powershell
python worker.py
```

The worker listens on `127.0.0.1:8787` by default.

## API

- `GET /health` — worker and ComfyUI connectivity status.
- `GET /queue` — current local queue.
- `POST /jobs` — enqueue a ComfyUI render job.
- `GET /jobs/<id>` — inspect a job.
- `POST /jobs/<id>/cancel` — cancel a queued job.

Example:

```json
POST /jobs
{
  "prompt": "Original surreal kid-friendly 3D cartoon character running through a candy city",
  "negative_prompt": "text, logo, watermark, existing IP, celebrity",
  "image_url": "http://127.0.0.1:3000/example.png",
  "width": 704,
  "height": 1280,
  "frames": 49,
  "fps": 16
}
```

The ComfyUI workflow is deliberately kept outside the application code. Export a known-good API workflow from ComfyUI to `workflow.json` and set `COMFYUI_WORKFLOW_FILE` in `.env`. The worker performs safe placeholder substitution for `{{PROMPT}}`, `{{NEGATIVE_PROMPT}}`, `{{IMAGE_PATH}}`, `{{WIDTH}}`, `{{HEIGHT}}`, `{{FRAMES}}`, and `{{FPS}}` where those values occur in the JSON.

## Important

This is the local renderer layer; it does not claim that 3,000 videos have already been rendered. A real 3,000-video benchmark must run on the physical GPU and will take substantial time, storage, heat, and power. The application can queue the benchmark and record pass/fail results once the local model is configured.
