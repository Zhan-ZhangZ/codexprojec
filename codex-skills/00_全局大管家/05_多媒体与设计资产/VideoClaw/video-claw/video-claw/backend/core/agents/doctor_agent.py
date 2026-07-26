# -*- coding: utf-8 -*-
"""
Doctor agent for generation failures.

The doctor is intentionally not a workflow stage. It is called only at failure
boundaries to decide whether a prompt can be safely rewrite and retried.
"""

import json
import logging
from typing import Any, Dict, Optional, Tuple

from .base_agent import AgentInterface
from config import Config
from prompts.loader import load_prompt

logger = logging.getLogger(__name__)


REASON_TYPE_PROMPT_SAFETY = "prompt_safety"
REASON_TYPE_PROMPT_TOO_LONG = "prompt_too_long"
REASON_TYPE_PROMPT_FORMAT = "prompt_format"
REASON_TYPE_MODEL_LIMITATION = "model_limitation"
REASON_TYPE_INPUT_ASSET = "input_asset"
REASON_TYPE_AUTH_CONFIG = "auth_config"
REASON_TYPE_NETWORK_TIMEOUT = "network_timeout"
REASON_TYPE_PROVIDER_INTERNAL = "provider_internal"
REASON_TYPE_UNKNOWN = "unknown"

DOCTOR_REASON_TYPES = {
    REASON_TYPE_PROMPT_SAFETY,
    REASON_TYPE_PROMPT_TOO_LONG,
    REASON_TYPE_PROMPT_FORMAT,
    REASON_TYPE_MODEL_LIMITATION,
    REASON_TYPE_INPUT_ASSET,
    REASON_TYPE_AUTH_CONFIG,
    REASON_TYPE_NETWORK_TIMEOUT,
    REASON_TYPE_PROVIDER_INTERNAL,
    REASON_TYPE_UNKNOWN,
}

REWRITABLE_REASON_TYPES = {
    REASON_TYPE_PROMPT_SAFETY,
    REASON_TYPE_PROMPT_TOO_LONG,
    REASON_TYPE_PROMPT_FORMAT,
}

DOCTOR_TOOLS = {"rewrite_prompt", "none"}
MAX_DOCTOR_ATTEMPTS = 3


class DoctorOutputError(ValueError):
    """Raised when the doctor LLM returns invalid structured output."""


class DoctorAgent(AgentInterface):
    """Diagnose generation errors and optionally rewrite prompts."""

    def __init__(self, llm_model: Optional[str] = None):
        super().__init__(name="Doctor")
        self.llm_model = llm_model or Config.LLM_MODEL

    async def process(self, input_data: Any, intervention: Optional[Dict] = None) -> Dict:
        """Compatibility wrapper for the agent interface; doctor is normally called directly."""
        input_data = input_data if isinstance(input_data, dict) else {}
        return {
            "payload": self.diagnose_error(
                stage=str(input_data.get("stage", "")),
                model=str(input_data.get("model", "")),
                prompt=str(input_data.get("prompt", "")),
                error=str(input_data.get("error", "")),
                context=input_data.get("context") if isinstance(input_data.get("context"), dict) else None,
            ),
            "requires_intervention": False,
            "stage_completed": True,
        }

    @staticmethod
    def no_action(reason: str, reason_type: str = REASON_TYPE_UNKNOWN) -> Dict[str, Any]:
        return {
            "matched": False,
            "reason_type": reason_type,
            "tool": "none",
            "should_retry": False,
            "confidence": 0.0,
            "reason": reason,
        }

    @staticmethod
    def _json_dumps(value: Any) -> str:
        return json.dumps(value or {}, ensure_ascii=False, indent=2)

    @staticmethod
    def _load_json_object(raw: str) -> Dict[str, Any]:
        data = json.loads(raw)
        if not isinstance(data, dict):
            raise DoctorOutputError("doctor output must be a JSON object")
        return data

    @staticmethod
    def _validate_diagnosis(data: Dict[str, Any]) -> Dict[str, Any]:
        reason_type = data.get("reason_type")
        tool = data.get("tool")
        should_retry = data.get("should_retry")
        confidence = data.get("confidence")
        reason = data.get("reason")

        if reason_type not in DOCTOR_REASON_TYPES:
            raise DoctorOutputError(f"reason_type must be one of {sorted(DOCTOR_REASON_TYPES)}")
        if tool not in DOCTOR_TOOLS:
            raise DoctorOutputError(f"tool must be one of {sorted(DOCTOR_TOOLS)}")
        if not isinstance(should_retry, bool):
            raise DoctorOutputError("should_retry must be a boolean")
        if not isinstance(confidence, (int, float)) or not 0 <= float(confidence) <= 1:
            raise DoctorOutputError("confidence must be a number between 0 and 1")
        if not isinstance(reason, str) or not reason.strip():
            raise DoctorOutputError("reason must be a non-empty string")
        if tool == "rewrite_prompt" and reason_type not in REWRITABLE_REASON_TYPES:
            raise DoctorOutputError("rewrite_prompt is only allowed for rewritable reason types")

        return {
            "matched": bool(data.get("matched", tool != "none")),
            "reason_type": reason_type,
            "tool": tool,
            "should_retry": should_retry,
            "confidence": float(confidence),
            "reason": reason.strip(),
        }

    @staticmethod
    def _validate_rewrite(data: Dict[str, Any], original_prompt: str) -> str:
        rewrite = data.get("rewrite_prompt")
        if not isinstance(rewrite, str) or not rewrite.strip():
            raise DoctorOutputError("rewrite_prompt must be a non-empty string")
        rewrite = rewrite.strip()
        if rewrite == (original_prompt or "").strip():
            raise DoctorOutputError("rewrite_prompt must differ from the original prompt")
        return rewrite

    @staticmethod
    def _rule_based_diagnosis(error: str) -> Optional[Dict[str, Any]]:
        text = (error or "").lower()
        safety_markers = (
            "datainspectionfailed",
            "inappropriate content",
            "content policy",
            "safety",
            "sensitive",
            "risk control",
            "审核",
            "违规",
            "敏感",
            "不合规",
            "安全",
        )
        if any(marker in text for marker in safety_markers):
            return {
                "matched": True,
                "reason_type": REASON_TYPE_PROMPT_SAFETY,
                "tool": "rewrite_prompt",
                "should_retry": True,
                "confidence": 0.95,
                "reason": "供应商返回内容安全或审核相关错误，疑似由生成提示词中的不文明、敏感或高风险表达触发。",
            }

        length_markers = ("maximum context", "max tokens", "too long", "context length", "超长", "长度")
        if any(marker in text for marker in length_markers):
            return {
                "matched": True,
                "reason_type": REASON_TYPE_PROMPT_TOO_LONG,
                "tool": "rewrite_prompt",
                "should_retry": True,
                "confidence": 0.85,
                "reason": "供应商错误指向提示词或上下文过长，需要压缩提示词后重试。",
            }

        asset_markers = ("file not found", "不存在", "missing", "not found", "路径")
        if any(marker in text for marker in asset_markers):
            return {
                "matched": True,
                "reason_type": REASON_TYPE_INPUT_ASSET,
                "tool": "none",
                "should_retry": False,
                "confidence": 0.85,
                "reason": "错误指向输入素材缺失或路径不可用，重写提示词无法修复。",
            }

        auth_markers = ("api key", "apikey", "unauthorized", "forbidden", "permission", "权限", "密钥")
        if any(marker in text for marker in auth_markers):
            return {
                "matched": True,
                "reason_type": REASON_TYPE_AUTH_CONFIG,
                "tool": "none",
                "should_retry": False,
                "confidence": 0.85,
                "reason": "错误指向鉴权、权限或配置问题，重写提示词无法修复。",
            }

        timeout_markers = ("timeout", "timed out", "超时")
        if any(marker in text for marker in timeout_markers):
            return {
                "matched": True,
                "reason_type": REASON_TYPE_NETWORK_TIMEOUT,
                "tool": "none",
                "should_retry": False,
                "confidence": 0.8,
                "reason": "错误指向网络或任务轮询超时，重写提示词不是合适修复方式。",
            }

        return None

    def diagnose_error(
        self,
        *,
        stage: str,
        model: str,
        prompt: str,
        error: str,
        context: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        rule_result = self._rule_based_diagnosis(error)
        if rule_result:
            return self._validate_diagnosis(rule_result)

        from models.llm_client import LLM

        template = load_prompt("doctor", "diagnose", "zh")
        validation_error = ""
        for attempt in range(MAX_DOCTOR_ATTEMPTS):
            doctor_prompt = template.format(
                stage=stage,
                model=model,
                error=error,
                original_prompt=prompt,
                context=self._json_dumps(context),
                reason_types=", ".join(sorted(DOCTOR_REASON_TYPES)),
                rewritable_reason_types=", ".join(sorted(REWRITABLE_REASON_TYPES)),
                tools=", ".join(sorted(DOCTOR_TOOLS)),
                validation_error=validation_error or "无",
            )
            try:
                raw = LLM().query(doctor_prompt, model=self.llm_model, safe_content=False)
                data = self._load_json_object(raw)
                return self._validate_diagnosis(data)
            except Exception as exc:
                validation_error = str(exc)
                logger.warning(
                    "Doctor diagnosis output invalid; retrying attempt=%s/%s error=%s",
                    attempt + 1,
                    MAX_DOCTOR_ATTEMPTS,
                    validation_error,
                )

        return self.no_action(f"doctor 输出多次校验失败，跳过自动修复: {validation_error}")

    def rewrite_prompt(
        self,
        *,
        prompt: str,
        reason: str,
        reason_type: str,
        stage: str,
        context: Optional[Dict[str, Any]] = None,
    ) -> Optional[str]:
        if reason_type not in REWRITABLE_REASON_TYPES:
            return None

        from models.llm_client import LLM

        template = load_prompt("doctor", "rewrite_prompt", "zh")
        validation_error = ""
        for attempt in range(MAX_DOCTOR_ATTEMPTS):
            rewrite_prompt = template.format(
                stage=stage,
                reason_type=reason_type,
                reason=reason,
                original_prompt=prompt,
                context=self._json_dumps(context),
                validation_error=validation_error or "无",
            )
            try:
                raw = LLM().query(rewrite_prompt, model=self.llm_model, safe_content=False)
                data = self._load_json_object(raw)
                return self._validate_rewrite(data, prompt)
            except Exception as exc:
                validation_error = str(exc)
                logger.warning(
                    "Doctor rewrite output invalid; retrying attempt=%s/%s error=%s",
                    attempt + 1,
                    MAX_DOCTOR_ATTEMPTS,
                    validation_error,
                )

        return None

    @staticmethod
    def build_rewrite_result(
        *,
        stage: str,
        model: str,
        original_prompt: str,
        optimized_prompt: str,
        error: str,
        diagnosis: Dict[str, Any],
    ) -> Dict[str, Any]:
        """Build the persisted rewrite record in one place so all stages stay consistent."""
        return {
            "stage": stage,
            "model": model,
            "error": error,
            "original_prompt": original_prompt,
            "optimized_prompt": optimized_prompt,
            "doctor_reason_type": diagnosis.get("reason_type", REASON_TYPE_UNKNOWN),
            "doctor_reason": diagnosis.get("reason", ""),
            "confidence": diagnosis.get("confidence", 0.0),
        }

    def maybe_rewrite_prompt(
        self,
        *,
        stage: str,
        model: str,
        prompt: str,
        error: str,
        context: Optional[Dict[str, Any]] = None,
    ) -> Tuple[Optional[str], Dict[str, Any], Optional[Dict[str, Any]]]:
        """Return a rewrite prompt when doctor finds a safe rewrite path."""
        try:
            diagnosis = self.diagnose_error(
                stage=stage,
                model=model,
                prompt=prompt,
                error=error,
                context=context,
            )
            if diagnosis.get("tool") != "rewrite_prompt" or not diagnosis.get("should_retry"):
                return None, diagnosis, None
            rewrite = self.rewrite_prompt(
                prompt=prompt,
                reason=diagnosis["reason"],
                reason_type=diagnosis["reason_type"],
                stage=stage,
                context=context,
            )
            if not rewrite:
                return None, diagnosis, None
            return rewrite, diagnosis, self.build_rewrite_result(
                stage=stage,
                model=model,
                original_prompt=prompt,
                optimized_prompt=rewrite,
                error=error,
                diagnosis=diagnosis,
            )
        except Exception as exc:
            logger.warning("Doctor failed and will be skipped: %s", exc, exc_info=True)
            return None, self.no_action(f"doctor 执行失败，跳过自动修复: {exc}"), None
