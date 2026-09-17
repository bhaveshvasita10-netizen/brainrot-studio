import os
import tempfile
from pathlib import Path

import gradio as gr
import spaces
import torch
from diffusers import LTXPipeline
from diffusers.utils import export_to_video

MODEL_ID = os.getenv("MODEL_ID", "Lightricks/LTX-Video")
DEVICE = "cuda" if torch.cuda.is_available() else "cpu"
DTYPE = torch.bfloat16 if DEVICE == "cuda" else torch.float32

_pipe = None


def get_pipeline():
    global _pipe
    if _pipe is None:
        _pipe = LTXPipeline.from_pretrained(MODEL_ID, dtype=DTYPE)
        _pipe.to(DEVICE)
        if DEVICE == "cuda":
            try:
                _pipe.vae.enable_tiling()
            except Exception:
                pass
    return _pipe


@spaces.GPU(duration=300)
def generate_video(prompt: str, image, seconds: int = 3, seed: int = 0):
    prompt = (prompt or "").strip()
    if not prompt:
        raise gr.Error("Prompt is required.")

    # Keep free ZeroGPU jobs deliberately short.
    seconds = max(2, min(int(seconds), 4))
    fps = 16
    frames = seconds * fps + 1
    width, height = 704, 1280
    pipe = get_pipeline()

    kwargs = {
        "prompt": prompt,
        "negative_prompt": "worst quality, blurry, jittery, distorted, text, logo, watermark, existing copyrighted character",
        "width": width,
        "height": height,
        "num_frames": frames,
        "num_inference_steps": 8,
        "guidance_scale": 1.0,
        "decode_timestep": 0.05,
        "decode_noise_scale": 0.025,
        "generator": torch.Generator(device=DEVICE).manual_seed(int(seed)),
    }

    if image is not None:
        kwargs["image"] = image
        kwargs["image_cond_noise_scale"] = 0.025

    result = pipe(**kwargs)
    frames_out = result.frames[0]
    output_dir = Path(tempfile.mkdtemp(prefix="brainrot-"))
    output_path = output_dir / "brainrot.mp4"
    export_to_video(frames_out, str(output_path), fps=fps)
    return str(output_path)


demo = gr.Interface(
    fn=generate_video,
    inputs=[
        gr.Textbox(label="Prompt", lines=4),
        gr.Image(label="Optional character image", type="pil"),
        gr.Slider(2, 4, value=3, step=1, label="Seconds"),
        gr.Number(value=0, precision=0, label="Seed"),
    ],
    outputs=gr.Video(label="Generated video"),
    title="Brainrot Studio — Free AI Video Worker",
    description="Short original cartoon image-to-video generation on Hugging Face ZeroGPU.",
    api_name="generate_video",
)

demo.launch()
