"""Pluggable diagnostic-check protocol for StatsPAI results."""

from .base import (
    Check,
    CheckContext,
    CheckResult,
    RobustnessBatteryCheck,
    check_result_from_robustness_report,
    run_checks,
)

__all__ = [
    "Check",
    "CheckContext",
    "CheckResult",
    "RobustnessBatteryCheck",
    "check_result_from_robustness_report",
    "run_checks",
]
