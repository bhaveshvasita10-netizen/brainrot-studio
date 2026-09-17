import json
import os
import queue
import threading
import time
import uuid
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

import requests

ROOT = Path(__file__).resolve().parent
COMFYUI_URL = os.getenv("COMFYUI_URL", "http://127.0.0.1:8188").rstrip("/")
HOST = os.getenv("WORKER_HOST", "127.0.0.1")
PORT = int(os.getenv("WORKER_PORT", "8787"))
WORKFLOW_FILE = Path(os.getenv("COMFYUI_WORKFLOW_FILE", str(ROOT / "workflow.json")))
MAX_QUEUE = int(os.getenv("WORKER_MAX_QUEUE", "4"))
MAX_JOB_SECONDS = int(os.getenv("WORKER_MAX_JOB_SECONDS", "1800"))

jobs = {}
jobs_lock = threading.Lock()
job_queue = queue.Queue(maxsize=MAX_QUEUE)


def now():
    return time.time()


def set_job(job_id, **changes):
    with jobs_lock:
        jobs[job_id].update(changes)


def substitute(value, job):
    if isinstance(value, dict):
        return {k: substitute(v, job) for k, v in value.items()}
    if isinstance(value, list):
        return [substitute(v, job) for v in value]
    if isinstance(value, str):
        replacements = {
            "{{PROMPT}}": job.get("prompt", ""),
            "{{NEGATIVE_PROMPT}}": job.get("negative_prompt", ""),
            "{{IMAGE_PATH}}": job.get("image_path", ""),
            "{{WIDTH}}": str(job.get("width", 704)),
            "{{HEIGHT}}": str(job.get("height", 1280)),
            "{{FRAMES}}": str(job.get("frames", 49)),
            "{{FPS}}": str(job.get("fps", 16)),
        }
        for old, new in replacements.items():
            value = value.replace(old, new)
    return value


def load_workflow(job):
    if not WORKFLOW_FILE.exists():
        raise RuntimeError(f"ComfyUI workflow not found: {WORKFLOW_FILE}. Export an API workflow and place it there.")
    with WORKFLOW_FILE.open("r", encoding="utf-8") as f:
        workflow = json.load(f)
    return substitute(workflow, job)


def comfy_health():
    try:
        r = requests.get(f"{COMFYUI_URL}/system_stats", timeout=5)
        return {"ok": r.ok, "status": r.status_code}
    except Exception as exc:
        return {"ok": False, "error": str(exc)}


def run_job(job_id):
    with jobs_lock:
        job = dict(jobs[job_id])
    set_job(job_id, status="running", started_at=now())
    try:
        workflow = load_workflow(job)
        client_id = str(uuid.uuid4())
        response = requests.post(
            f"{COMFYUI_URL}/prompt",
            json={"prompt": workflow, "client_id": client_id},
            timeout=30,
        )
        response.raise_for_status()
        prompt_id = response.json().get("prompt_id")
        if not prompt_id:
            raise RuntimeError(f"ComfyUI did not return prompt_id: {response.text[:500]}")
        set_job(job_id, comfy_prompt_id=prompt_id)

        deadline = time.time() + MAX_JOB_SECONDS
        while time.time() < deadline:
            with jobs_lock:
                if jobs[job_id].get("cancel_requested"):
                    raise RuntimeError("Job cancelled.")
            history = requests.get(f"{COMFYUI_URL}/history/{prompt_id}", timeout=10)
            if history.ok:
                data = history.json().get(prompt_id)
                if data and data.get("outputs") is not None:
                    set_job(job_id, status="completed", completed_at=now(), outputs=data.get("outputs", {}), result=data)
                    return
            time.sleep(2)
        raise TimeoutError(f"ComfyUI job exceeded {MAX_JOB_SECONDS} seconds.")
    except Exception as exc:
        set_job(job_id, status="failed", completed_at=now(), error=str(exc))


def worker_loop():
    while True:
        job_id = job_queue.get()
        try:
            run_job(job_id)
        finally:
            job_queue.task_done()


class Handler(BaseHTTPRequestHandler):
    def _json(self, code, payload):
        raw = json.dumps(payload).encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(raw)))
        self.end_headers()
        self.wfile.write(raw)

    def do_GET(self):
        if self.path == "/health":
            with jobs_lock:
                running = sum(1 for j in jobs.values() if j.get("status") == "running")
                queued = sum(1 for j in jobs.values() if j.get("status") == "queued")
            self._json(200, {"ok": True, "worker": "brainrot-local-gpu", "running": running, "queued": queued, "comfyui": comfy_health()})
            return
        if self.path == "/queue":
            with jobs_lock:
                self._json(200, {"jobs": list(jobs.values())})
            return
        if self.path.startswith("/jobs/"):
            job_id = self.path.split("/", 2)[2]
            with jobs_lock:
                job = jobs.get(job_id)
            if not job:
                self._json(404, {"error": "Job not found"})
            else:
                self._json(200, job)
            return
        self._json(404, {"error": "Not found"})

    def do_POST(self):
        if self.path == "/jobs":
            try:
                length = int(self.headers.get("Content-Length", "0"))
                body = json.loads(self.rfile.read(length) or b"{}")
                prompt = str(body.get("prompt", "")).strip()
                if not prompt:
                    return self._json(400, {"error": "prompt is required"})
                job_id = str(uuid.uuid4())
                job = {
                    "id": job_id,
                    "status": "queued",
                    "created_at": now(),
                    "prompt": prompt,
                    "negative_prompt": str(body.get("negative_prompt", "text, logo, watermark, existing IP, celebrity")),
                    "image_path": str(body.get("image_path", "")),
                    "width": int(body.get("width", 704)),
                    "height": int(body.get("height", 1280)),
                    "frames": int(body.get("frames", 49)),
                    "fps": int(body.get("fps", 16)),
                }
                with jobs_lock:
                    jobs[job_id] = job
                try:
                    job_queue.put_nowait(job_id)
                except queue.Full:
                    with jobs_lock:
                        jobs.pop(job_id, None)
                    return self._json(429, {"error": "Local render queue is full"})
                return self._json(202, job)
            except Exception as exc:
                return self._json(400, {"error": str(exc)})

        if self.path.startswith("/jobs/") and self.path.endswith("/cancel"):
            job_id = self.path.split("/")[2]
            with jobs_lock:
                job = jobs.get(job_id)
                if not job:
                    return self._json(404, {"error": "Job not found"})
                if job.get("status") == "queued":
                    job["status"] = "cancelled"
                else:
                    job["cancel_requested"] = True
            return self._json(200, job)

        self._json(404, {"error": "Not found"})

    def log_message(self, fmt, *args):
        print(f"[{time.strftime('%H:%M:%S')}] {fmt % args}")


if __name__ == "__main__":
    threading.Thread(target=worker_loop, daemon=True).start()
    server = ThreadingHTTPServer((HOST, PORT), Handler)
    print(f"Brainrot local GPU worker listening on http://{HOST}:{PORT}")
    print(f"ComfyUI: {COMFYUI_URL}")
    server.serve_forever()
