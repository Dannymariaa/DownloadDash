import asyncio
import json
import os
import shutil
import sys
import uuid
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional

from app.config import settings


MEDIA_EXTENSIONS = {
    ".jpg": "image",
    ".jpeg": "image",
    ".png": "image",
    ".webp": "image",
    ".gif": "image",
    ".mp4": "video",
    ".mov": "video",
    ".webm": "video",
    ".m4v": "video",
    ".mp3": "audio",
    ".m4a": "audio",
    ".aac": "audio",
    ".ogg": "audio",
    ".wav": "audio",
}


class GalleryDLDownloader:
    """Small async wrapper around gallery-dl for public gallery-style media."""

    def __init__(
        self,
        download_path: str,
        cookiefile: Optional[str] = None,
        cookie_data: Optional[str] = None,
        proxy_url: Optional[str] = None,
        timeout_seconds: int = 300,
    ):
        self.base_path = Path(download_path).resolve() / "gallery-dl"
        self.base_path.mkdir(parents=True, exist_ok=True)
        self.cookiefile = self._prepare_cookiefile(cookiefile, cookie_data)
        self.proxy_url = proxy_url
        self.timeout_seconds = timeout_seconds
        self.jobs: Dict[str, Dict[str, Any]] = {}

    def _prepare_cookiefile(self, cookiefile: Optional[str], cookie_data: Optional[str]) -> Optional[str]:
        if cookiefile:
            return cookiefile
        if not cookie_data:
            return None

        cookie_text = cookie_data.replace("\\n", "\n").strip()
        if not cookie_text:
            return None

        cookie_path = Path(settings.TEMP_PATH) / "gallery-dl-cookies.txt"
        cookie_path.write_text(cookie_text + "\n", encoding="utf-8")
        return str(cookie_path)

    def _base_command(self) -> List[str]:
        command = [sys.executable, "-m", "gallery_dl", "--no-colors"]
        if self.cookiefile:
            command.extend(["-o", f"cookies={self.cookiefile}"])
        if self.proxy_url:
            command.extend(["-o", f"proxy={self.proxy_url}"])
        return command

    async def resolve(self, url: str, limit: int = 25) -> Dict[str, Any]:
        command = [*self._base_command(), "-J", "-o", "output.private=false", url]
        proc = await asyncio.create_subprocess_exec(
            *command,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )

        try:
            stdout, stderr = await asyncio.wait_for(proc.communicate(), timeout=min(self.timeout_seconds, 90))
        except asyncio.TimeoutError:
            proc.kill()
            await proc.communicate()
            raise TimeoutError("gallery-dl metadata resolve timed out")

        if proc.returncode not in (0, 1):
            raise RuntimeError((stderr or stdout).decode("utf-8", errors="replace").strip() or "gallery-dl failed")

        data = self._parse_json(stdout)
        items = self._items_from_data(data, limit=limit)
        return {
            "success": True,
            "url": url,
            "count": len(items),
            "items": items,
            "warnings": self._warnings_from_stderr(stderr),
        }

    def start_download(self, url: str, limit: int = 50) -> Dict[str, Any]:
        job_id = str(uuid.uuid4())
        job_dir = self.base_path / job_id
        job_dir.mkdir(parents=True, exist_ok=True)
        self.jobs[job_id] = {
            "id": job_id,
            "url": url,
            "status": "queued",
            "created_at": datetime.utcnow().isoformat() + "Z",
            "updated_at": datetime.utcnow().isoformat() + "Z",
            "files": [],
            "error": None,
            "warnings": [],
        }
        asyncio.create_task(self._run_download(job_id, url, job_dir, limit))
        return self.jobs[job_id]

    def get_job(self, job_id: str) -> Optional[Dict[str, Any]]:
        return self.jobs.get(job_id)

    def get_job_file(self, job_id: str, filename: str) -> Optional[Path]:
        job_dir = (self.base_path / job_id).resolve()
        candidate = (job_dir / filename).resolve()
        if not str(candidate).startswith(str(job_dir)) or not candidate.is_file():
            return None
        return candidate

    async def _run_download(self, job_id: str, url: str, job_dir: Path, limit: int) -> None:
        job = self.jobs[job_id]
        job["status"] = "processing"
        job["updated_at"] = datetime.utcnow().isoformat() + "Z"

        command = [
            *self._base_command(),
            "-D",
            str(job_dir),
            "-f",
            "{category}_{subcategory}_{id}_{num}.{extension}",
            "--range",
            f"1-{max(1, min(limit, 200))}",
            url,
        ]

        proc = await asyncio.create_subprocess_exec(
            *command,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )

        try:
            stdout, stderr = await asyncio.wait_for(proc.communicate(), timeout=self.timeout_seconds)
        except asyncio.TimeoutError:
            proc.kill()
            await proc.communicate()
            job["status"] = "failed"
            job["error"] = "gallery-dl download timed out"
            job["updated_at"] = datetime.utcnow().isoformat() + "Z"
            return

        files = self._scan_files(job_id, job_dir)
        job["files"] = files
        job["warnings"] = self._warnings_from_stderr(stderr)
        job["stdout"] = stdout.decode("utf-8", errors="replace")[-2000:]
        job["updated_at"] = datetime.utcnow().isoformat() + "Z"

        if files:
            job["status"] = "completed"
            return

        job["status"] = "failed"
        job["error"] = (stderr or stdout).decode("utf-8", errors="replace").strip() or "No files downloaded"

    def _scan_files(self, job_id: str, job_dir: Path) -> List[Dict[str, Any]]:
        files = []
        for path in sorted(job_dir.rglob("*")):
            if not path.is_file() or path.suffix.lower() in {".part", ".json"}:
                continue
            rel = path.relative_to(job_dir).as_posix()
            ext = path.suffix.lower()
            files.append(
                {
                    "filename": rel,
                    "size": path.stat().st_size,
                    "media_type": MEDIA_EXTENSIONS.get(ext, "file"),
                    "extension": ext.lstrip("."),
                    "download_url": f"/gallery/file/{job_id}/{rel}",
                }
            )
        return files

    def _parse_json(self, stdout: bytes) -> Any:
        text = stdout.decode("utf-8", errors="replace").strip()
        if not text:
            return []
        return json.loads(text)

    def _items_from_data(self, data: Any, limit: int) -> List[Dict[str, Any]]:
        messages = data if isinstance(data, list) else []
        items: List[Dict[str, Any]] = []
        for msg in messages:
            if not isinstance(msg, list) or len(msg) < 2:
                continue
            if msg[0] not in (2, 3):
                continue
            url = msg[1] if len(msg) > 1 else None
            meta = msg[2] if len(msg) > 2 and isinstance(msg[2], dict) else {}
            if not isinstance(url, str):
                continue
            ext = str(meta.get("extension") or Path(url.split("?")[0]).suffix.lstrip(".") or "").lower()
            items.append(
                {
                    "url": url,
                    "title": meta.get("title") or meta.get("filename"),
                    "filename": meta.get("filename"),
                    "extension": ext or None,
                    "media_type": MEDIA_EXTENSIONS.get(f".{ext}", "file") if ext else "file",
                    "width": meta.get("width"),
                    "height": meta.get("height"),
                    "date": meta.get("date"),
                    "author": meta.get("author") or meta.get("username") or meta.get("user"),
                }
            )
            if len(items) >= limit:
                break
        return items

    def _warnings_from_stderr(self, stderr: bytes) -> List[str]:
        text = stderr.decode("utf-8", errors="replace").strip()
        if not text:
            return []
        return [line for line in text.splitlines()[-8:] if line.strip()]

    def clear_job(self, job_id: str) -> bool:
        job_dir = self.base_path / job_id
        self.jobs.pop(job_id, None)
        if job_dir.exists():
            shutil.rmtree(job_dir, ignore_errors=True)
            return True
        return False
