from __future__ import annotations


class DataSourceError(Exception):
    """Base class for data source related errors."""


class UnsupportedMarketError(DataSourceError):
    """Raised when a requested market type is not supported by DataSourceFactory."""

    def __init__(self, market: str):
        self.market = str(market or "")
        super().__init__(f"Unsupported market type: {self.market}")

