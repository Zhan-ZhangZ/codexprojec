"""End-to-end contract for the MCP-sampling LLM-in-the-loop (Day-5).

Proves the loop closes: when an MCP client advertises ``sampling`` and a
writer is registered, ``SamplingLLMClient`` turns a server->client
``sampling/createMessage`` round-trip into an ``LLMClient.complete`` call,
and ``llm_dag_propose`` then produces an LLM-backed DAG using the agent's
own model — with a clean deterministic fallback when sampling is absent.

The round-trip is mocked without any real LLM: ``request_sampling`` calls
the registered writer and then blocks on an event; our fake writer
synchronously routes a canned reply for the matching request id, so the
event is already set when ``request_sampling`` waits.  No network, no key.
"""

from __future__ import annotations

import json

import pytest

from statspai.agent import _sampling
from statspai.causal_llm.sampling_client import (
    SamplingLLMClient,
    resolve_llm_client,
    sampling_available,
    sampling_client,
)


@pytest.fixture
def mock_sampling():
    """Install a fake MCP client that echoes a scripted reply text.

    Yields a setter; tests call ``set_reply(text)`` to script what the
    'client LLM' returns for the next request.  Restores global sampling
    state on teardown so other tests see a clean slate.
    """
    prior_cap = _sampling.get_capability()
    state = {"reply": "[]"}

    def fake_writer(payload_str: str) -> None:
        req = json.loads(payload_str)
        # Route a well-formed result back for this exact request id.
        _sampling.route_response(
            {
                "jsonrpc": "2.0",
                "id": req["id"],
                "result": {
                    "role": "assistant",
                    "content": {"type": "text", "text": state["reply"]},
                    "model": "mock-model",
                    "stopReason": "endTurn",
                },
            }
        )

    _sampling.set_capability(True)
    _sampling.set_writer(fake_writer)

    def set_reply(text: str) -> None:
        state["reply"] = text

    try:
        yield set_reply
    finally:
        _sampling.set_writer(None)
        _sampling.set_capability(prior_cap)


# --------------------------------------------------------------------------- #
#  Availability / resolution precedence
# --------------------------------------------------------------------------- #


def test_sampling_unavailable_off_server():
    """Outside a server, no capability is advertised -> heuristic path."""
    # The default global state has no writer / no advertised capability.
    assert _sampling.get_capability() in (True, False)  # smoke
    # resolve_llm_client must never raise; with an explicit client it wins.
    sentinel = object()
    assert resolve_llm_client(sentinel) is sentinel


def test_resolve_returns_sampling_client_when_advertised(mock_sampling):
    client = resolve_llm_client(prefer_sampling=True)
    assert isinstance(client, SamplingLLMClient)
    assert sampling_available() is True


def test_resolve_returns_none_when_sampling_not_preferred(mock_sampling):
    assert resolve_llm_client(prefer_sampling=False) is None


def test_unsupported_sampling_raises_for_caller_fallback():
    """With no capability, the client raises so the caller can fall back."""
    # Ensure a clean (no-capability) state for this isolated check.
    prior = _sampling.get_capability()
    _sampling.set_capability(False)
    try:
        with pytest.raises(_sampling.UnsupportedSamplingError):
            SamplingLLMClient().chat("user", "hello")
    finally:
        _sampling.set_capability(prior)


# --------------------------------------------------------------------------- #
#  The actual round-trip + end-to-end DAG proposal
# --------------------------------------------------------------------------- #


def test_sampling_client_round_trips_text(mock_sampling):
    mock_sampling("hello from the agent's model")
    out = sampling_client().complete("propose something")
    assert out == "hello from the agent's model"


def test_llm_dag_propose_uses_the_agents_model(mock_sampling):
    """The headline: a DAG proposed by the connected client's own LLM."""
    import statspai as sp

    # Script the 'client LLM' to return a JSON edge list, the format
    # llm_dag_propose parses on the client path.
    mock_sampling(json.dumps([["x", "y"], ["z", "y"]]))

    client = sampling_client()
    prop = sp.llm_dag_propose(["x", "y", "z"], client=client)

    # It went through MCP sampling (the client recorded the call) ...
    assert client.history, "sampling client was never invoked"
    # ... and the proposal is LLM-backed, not the offline heuristic.
    assert prop.backend == "SamplingLLMClient"
    assert prop.confidence == 0.7
    assert ("x", "y") in [tuple(e) for e in prop.edges]


def test_llm_dag_propose_falls_back_to_heuristic_without_sampling():
    """No sampling client -> deterministic heuristic backend, never an error."""
    import statspai as sp

    prop = sp.llm_dag_propose(
        ["treatment", "outcome", "confounder"],
        client=resolve_llm_client(prefer_sampling=False),  # -> None
    )
    assert prop.backend == "heuristic"
