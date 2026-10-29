"""Safe local storage helpers for user-provided files."""
from pathlib import Path
from uuid import uuid4

from fastapi import HTTPException, UploadFile

from app.config import settings

MAX_UPLOAD_BYTES = 10 * 1024 * 1024
UPLOAD_CHUNK_BYTES = 64 * 1024


def display_filename(filename: str | None) -> str:
    """Return a display-only basename, handling paths from Windows and POSIX clients."""
    name = (filename or "").replace("\\", "/").rsplit("/", 1)[-1].strip()
    return name[:255] or "upload"


def save_upload(file: UploadFile, allowed_extensions: set[str]) -> tuple[Path, str]:
    """Validate the extension and size, then save under a generated name."""
    original_name = display_filename(file.filename)
    extension = Path(original_name).suffix.lower()
    if extension not in allowed_extensions:
        allowed = ", ".join(sorted(allowed_extensions))
        raise HTTPException(415, f"Unsupported file type. Allowed extensions: {allowed}")

    upload_dir = Path(settings.UPLOAD_DIR).resolve()
    upload_dir.mkdir(parents=True, exist_ok=True)
    stored_path = upload_dir / f"{uuid4().hex}{extension}"
    total_bytes = 0

    try:
        with stored_path.open("xb") as destination:
            while True:
                chunk = file.file.read(UPLOAD_CHUNK_BYTES)
                if not chunk:
                    break
                total_bytes += len(chunk)
                if total_bytes > MAX_UPLOAD_BYTES:
                    raise HTTPException(413, "File exceeds the 10 MB upload limit")
                destination.write(chunk)
    except Exception:
        stored_path.unlink(missing_ok=True)
        raise

    if total_bytes == 0:
        stored_path.unlink(missing_ok=True)
        raise HTTPException(422, "Uploaded file is empty")

    return stored_path, original_name


def delete_upload(path: str | Path) -> None:
    """Delete a stored upload only when it resolves inside the configured upload directory."""
    upload_dir = Path(settings.UPLOAD_DIR).resolve()
    stored_path = Path(path).resolve()
    try:
        stored_path.relative_to(upload_dir)
    except ValueError as exc:
        raise ValueError("Refusing to delete a file outside the upload directory") from exc
    stored_path.unlink(missing_ok=True)
