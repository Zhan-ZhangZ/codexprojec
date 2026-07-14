"""claude-real-video — let Claude (or any LLM) actually watch a video.

Scene-aware + deduplicated frame extraction plus an optional transcript,
from a URL (yt-dlp) or a local file.
"""
from .core import process, Result

__version__ = "0.2.0"
__all__ = ["process", "Result", "__version__"]
