"""Configuration utilities."""

import toml

from src.standard.llm_client import resolve_llm_config

__all__ = ["load_config", "resolve_llm_config"]


def load_config(path: str = "config/config.toml") -> dict:
    with open(path, "r", encoding="utf-8") as f:
        return toml.load(f)
