"""MCP-sampling-backed :class:`LLMClient` — closes the LLM-in-the-loop.

The LLM-DAG helpers (:func:`llm_dag_propose`, :func:`llm_dag_validate`,
:func:`llm_dag_constrained`) and :func:`causal_mas` already accept any
object exposing ``complete(prompt)`` / ``chat(role, prompt)``.  Until now
the only such clients were ``openai_client`` / ``anthropic_client`` —
both needing the *user's* own API key.

When StatsPAI runs as an MCP server, the connected client (Claude
Desktop, an IDE, an agent runtime) has already authenticated an LLM and
advertised ``capabilities.sampling``.  This module bridges that:
:class:`SamplingLLMClient` turns the server→client
``sampling/createMessage`` round-trip
(:func:`statspai.agent._sampling.request_sampling`) into the ``chat``
interface, so the package can *reuse the agent's own model* to propose a
DAG / critique edges with no extra key.

The contract is "use the agent's LLM **if it offered one**, else fall
back deterministically":

* :func:`resolve_llm_client` returns a :class:`SamplingLLMClient` only
  when the client advertised sampling; otherwise ``None`` (the LLM-DAG
  helpers then run their offline heuristic — never a hard failure).
* Mid-call sampling failures (timeout, client error) surface as the
  usual exceptions so an orchestration layer can log a degradation and
  fall back, rather than silently returning a wrong graph.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional

from .llm_clients import LLMClient


def _extract_text(result: Dict[str, Any]) -> str:
    """Pull plain text out of an MCP ``sampling/createMessage`` result.

    Spec shape is ``{"content": {"type": "text", "text": ...}}`` but some
    clients return a list of content blocks; handle both.
    """
    content = result.get("content")
    if isinstance(content, dict):
        return str(content.get("text", "") or "")
    if isinstance(content, list):
        parts = [
            str(b.get("text", ""))
            for b in content
            if isinstance(b, dict) and b.get("type", "text") == "text"
        ]
        return "".join(parts)
    return str(content or "")


@dataclass
class SamplingLLMClient(LLMClient):
    """``LLMClient`` whose completions come from the MCP client's own model.

    Each :meth:`chat` call issues one ``sampling/createMessage`` request
    via :func:`statspai.agent._sampling.request_sampling`.  Raises
    :class:`~statspai.agent._sampling.UnsupportedSamplingError` if the
    client never advertised sampling, and
    :class:`~statspai.agent._sampling.SamplingTimeoutError` on timeout —
    callers should catch these to fall back to the heuristic path.
    """

    system_prompt: str = (
        "You are a careful causal-inference assistant. Respond concisely "
        "and in exactly the format the prompt requests."
    )
    max_tokens: int = 1024
    temperature: Optional[float] = 0.0
    name: str = "mcp_sampling"
    history: List[Dict[str, Any]] = field(default_factory=list)

    def chat(self, role: str, prompt: str) -> str:
        # Imported lazily: the agent package is heavier than causal_llm and
        # we must not create an import cycle at module load.
        from ..agent import _sampling

        messages = [
            {"role": "user", "content": {"type": "text", "text": f"[{role}]\n{prompt}"}}
        ]
        result = _sampling.request_sampling(
            messages,
            max_tokens=self.max_tokens,
            system_prompt=self.system_prompt,
            temperature=self.temperature,
        )
        text = _extract_text(result)
        self.history.append({"role": role, "prompt": prompt, "response": text})
        return text


def sampling_client(
    *,
    system_prompt: Optional[str] = None,
    max_tokens: int = 1024,
    temperature: Optional[float] = 0.0,
) -> SamplingLLMClient:
    """Construct a :class:`SamplingLLMClient` (factory mirroring the others)."""
    kwargs: Dict[str, Any] = {"max_tokens": max_tokens, "temperature": temperature}
    if system_prompt is not None:
        kwargs["system_prompt"] = system_prompt
    return SamplingLLMClient(**kwargs)


def sampling_available() -> bool:
    """True iff the connected MCP client advertised ``capabilities.sampling``.

    Safe to call outside any server (returns ``False`` rather than
    raising) so offline callers degrade cleanly to the heuristic path.
    """
    try:
        from ..agent import _sampling

        return bool(_sampling.get_capability())
    except (AttributeError, ImportError, RuntimeError):
        return False


def resolve_llm_client(
    explicit: Optional[Any] = None,
    *,
    prefer_sampling: bool = True,
) -> Optional[Any]:
    """Pick the LLM client to hand an LLM-DAG helper.

    Precedence: an ``explicit`` client wins; otherwise, when
    ``prefer_sampling`` and the MCP client advertised sampling, return a
    :class:`SamplingLLMClient`; otherwise ``None`` so the caller runs its
    deterministic heuristic.  Never raises — resolution failure means
    "no LLM, use the offline path".
    """
    if explicit is not None:
        return explicit
    if prefer_sampling and sampling_available():
        return sampling_client()
    return None


__all__ = [
    "SamplingLLMClient",
    "sampling_client",
    "sampling_available",
    "resolve_llm_client",
]
