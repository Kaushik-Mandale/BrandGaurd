"""Brand assets router: logo upload, brand palette management with tenant isolation."""
import os

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from fastapi.responses import FileResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.db import get_db
from app.models import BrandAsset, User
from app.schemas import BrandAssetOut
from app.services.uploads import delete_upload, save_upload
from app.services.vision import IMAGE_EXT

router = APIRouter(prefix="/assets", tags=["assets"])


class PaletteBody(BaseModel):
    name: str
    colors: list[str]  # hex codes e.g. ["#1D3557", "#457B9D"]


@router.get("", response_model=list[BrandAssetOut])
def list_assets(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return db.query(BrandAsset).filter_by(org_id=user.org_id).order_by(BrandAsset.created_at.desc()).all()


@router.post("/logo", response_model=BrandAssetOut)
def upload_logo(
    file: UploadFile = File(...),
    name: str = Form(""),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    dest, original_name = save_upload(file, IMAGE_EXT)
    import cv2
    if cv2.imread(str(dest)) is None:
        delete_upload(dest)
        raise HTTPException(422, "Uploaded logo image could not be decoded")

    asset = BrandAsset(
        org_id=user.org_id,
        kind="logo",
        name=(name.strip() or original_name or "Logo")[:200],
        file_path=str(dest),
        data={},
    )
    db.add(asset)
    db.commit()
    db.refresh(asset)
    return asset


@router.post("/palette", response_model=BrandAssetOut)
def create_palette(
    body: PaletteBody,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    asset = BrandAsset(
        org_id=user.org_id,
        kind="palette",
        name=body.name,
        data={"colors": body.colors},
    )
    db.add(asset)
    db.commit()
    db.refresh(asset)
    return asset


@router.get("/{asset_id}/file")
def get_asset_file(
    asset_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    asset = db.get(BrandAsset, asset_id)
    if not asset or asset.org_id != user.org_id or not asset.file_path or not os.path.exists(asset.file_path):
        raise HTTPException(404, "Asset file not found")
    return FileResponse(asset.file_path)


@router.delete("/{asset_id}")
def delete_asset(
    asset_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    asset = db.get(BrandAsset, asset_id)
    if not asset or asset.org_id != user.org_id:
        raise HTTPException(404, "Not found")
    file_path = asset.file_path
    db.delete(asset)
    db.commit()
    if file_path:
        delete_upload(file_path)
    return {"deleted": asset_id}
