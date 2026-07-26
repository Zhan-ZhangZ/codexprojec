import logging
import os
import shutil
import time
from typing import Optional

from fastapi import APIRouter, File, HTTPException, UploadFile

from config import settings
from models.file_reader import FileReader

logger = logging.getLogger(__name__)
router = APIRouter(tags=["Files"])


def _path_size(path: str) -> int:
    if os.path.isfile(path) or os.path.islink(path):
        return os.path.getsize(path)
    total = 0
    for root, dirs, files in os.walk(path):
        for name in files:
            item = os.path.join(root, name)
            try:
                total += os.path.getsize(item)
            except OSError:
                continue
        for name in dirs:
            item = os.path.join(root, name)
            if os.path.islink(item):
                try:
                    total += os.path.getsize(item)
                except OSError:
                    continue
    return total


@router.post("/api/upload_file")
async def upload_file(file: UploadFile = File(...)):
    allowed_exts = [".docx", ".doc", ".txt", ".md", ".pdf"]
    filename = file.filename
    ext = os.path.splitext(filename)[1].lower()
    if ext not in allowed_exts:
        raise HTTPException(status_code=400, detail=f"仅支持 {', '.join(allowed_exts)} 格式的文件")

    os.makedirs(settings.TEMP_DIR, exist_ok=True)
    safe_filename = f"{int(time.time())}_{filename}"
    file_path = os.path.join(settings.TEMP_DIR, safe_filename)
    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        logger.error(f"保存上传文件失败: {e}")
        raise HTTPException(status_code=500, detail=f"文件保存失败: {str(e)}")

    return {"filename": filename, "file_path": safe_filename}


@router.post("/api/upload_media")
async def upload_media(file: UploadFile = File(...)):
    allowed_exts = [
        ".jpg", ".jpeg", ".png", ".webp", ".bmp",
        ".mp4", ".mov", ".avi", ".mkv", ".webm",
    ]
    filename = file.filename or "upload"
    ext = os.path.splitext(filename)[1].lower()
    if ext not in allowed_exts:
        raise HTTPException(status_code=400, detail=f"仅支持 {', '.join(allowed_exts)} 格式的媒体文件")

    os.makedirs(settings.TEMP_DIR, exist_ok=True)
    safe_filename = f"{int(time.time())}_{filename}"
    file_path = os.path.join(settings.TEMP_DIR, safe_filename)
    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        logger.error(f"保存上传媒体失败: {e}")
        raise HTTPException(status_code=500, detail=f"媒体保存失败: {str(e)}")

    return {
        "filename": filename,
        "file_path": file_path,
    }


@router.delete("/api/cache/temp")
async def clear_temp_cache():
    os.makedirs(settings.TEMP_DIR, exist_ok=True)
    deleted = 0
    freed_bytes = 0
    errors = []
    for entry in os.scandir(settings.TEMP_DIR):
        try:
            freed_bytes += _path_size(entry.path)
            if entry.is_dir(follow_symlinks=False):
                shutil.rmtree(entry.path)
            else:
                os.remove(entry.path)
            deleted += 1
        except Exception as exc:
            logger.warning("Failed to delete temp cache item: %s", entry.path, exc_info=True)
            errors.append({"path": entry.name, "error": str(exc)})
    return {
        "status": "ok",
        "deleted": deleted,
        "freed_bytes": freed_bytes,
        "freed_mb": round(freed_bytes / 1024 / 1024, 2),
        "errors": errors,
    }


def merge_uploaded_file_into_idea(idea: str, file_path: Optional[str]) -> str:
    if not file_path:
        return idea

    full_path = os.path.join(settings.TEMP_DIR, file_path)
    if not os.path.exists(full_path):
        logger.warning(f"上传的文件未找到: {full_path}")
        return idea

    content = FileReader.extract_text(full_path)
    if content:
        original_filename = "_".join(file_path.split("_")[1:])
        prompt_fragment = FileReader.format_as_prompt(original_filename, content)
        idea = f"{idea}\n\n{prompt_fragment}"
    logger.info(f"成功处理上传文件: {full_path}")
    logger.debug(f"文件内容预览:\n{content[:500]}")
    return idea
