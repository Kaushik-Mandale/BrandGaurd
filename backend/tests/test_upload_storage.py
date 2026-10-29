import io

import pytest
from fastapi import HTTPException
from starlette.datastructures import UploadFile

from app.services import uploads


def test_upload_uses_generated_path_and_strips_client_path(tmp_path, monkeypatch):
    monkeypatch.setattr(uploads.settings, "UPLOAD_DIR", str(tmp_path))
    file = UploadFile(filename=r"..\outside\brand-notes.txt", file=io.BytesIO(b"approved text"))

    stored_path, display_name = uploads.save_upload(file, {".txt"})

    assert stored_path.parent == tmp_path
    assert stored_path.name != "brand-notes.txt"
    assert display_name == "brand-notes.txt"
    assert stored_path.read_bytes() == b"approved text"


def test_upload_rejects_unsupported_extensions(tmp_path, monkeypatch):
    monkeypatch.setattr(uploads.settings, "UPLOAD_DIR", str(tmp_path))
    file = UploadFile(filename="brand-notes.exe", file=io.BytesIO(b"content"))

    with pytest.raises(HTTPException) as error:
        uploads.save_upload(file, {".txt", ".pdf"})

    assert error.value.status_code == 415
    assert list(tmp_path.iterdir()) == []


def test_upload_enforces_limit_and_removes_partial_file(tmp_path, monkeypatch):
    monkeypatch.setattr(uploads.settings, "UPLOAD_DIR", str(tmp_path))
    monkeypatch.setattr(uploads, "MAX_UPLOAD_BYTES", 3)
    file = UploadFile(filename="brand-notes.txt", file=io.BytesIO(b"more than three bytes"))

    with pytest.raises(HTTPException) as error:
        uploads.save_upload(file, {".txt"})

    assert error.value.status_code == 413
    assert list(tmp_path.iterdir()) == []


def test_delete_upload_refuses_paths_outside_storage(tmp_path, monkeypatch):
    monkeypatch.setattr(uploads.settings, "UPLOAD_DIR", str(tmp_path / "uploads"))
    outside_file = tmp_path / "outside.txt"
    outside_file.write_text("keep this file", encoding="utf-8")

    with pytest.raises(ValueError, match="outside the upload directory"):
        uploads.delete_upload(outside_file)

    assert outside_file.exists()
