from typing import Any, Dict

from fastapi import APIRouter
from pydantic import BaseModel, Field

from api.logging_config import apply_access_log_setting, apply_log_level_setting
from config import Config, CONFIG_PATH

router = APIRouter(tags=["Configuration"])


class ConfigUpdateRequest(BaseModel):
    values: Dict[str, Any] = Field(default_factory=dict)


@router.get("/api/config")
async def get_config():
    return {
        "config": Config.as_dict(),
        "path": str(CONFIG_PATH),
    }


@router.put("/api/config")
async def update_config(req: ConfigUpdateRequest):
    config = Config.update_config(req.values)
    apply_log_level_setting()
    apply_access_log_setting()
    return {
        "config": config,
        "path": str(CONFIG_PATH),
    }
