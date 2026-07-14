"""Unit tests for the chat ``/handoff`` slash command (op-005)."""

from __future__ import annotations

import asyncio
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

from bernstein.cli.commands.chat_cmd import ChatSession, _TaskDispatcher
from bernstein.core.chat import AllowList, Binding, BindingStore, PendingApproval
from bernstein.core.chat.bridge import BridgeProtocol, ChatMessage
from bernstein.core.handoff import HandoffTokenStore, StreamTailBuffer


@dataclass(slots=True)
class _FakeBridge(BridgeProtocol):
    platform: str = "telegram"
    sent: list[tuple[str, str]] = field(default_factory=list)
    edits: list[tuple[str, str, str]] = field(default_factory=list)
    cmd_handlers: dict[str, Any] = field(default_factory=dict)
    button_handler: Any = None
    approvals: list[PendingApproval] = field(default_factory=list)
    next_message_id: int = 1

    async def start(self) -> None:
        return None

    async def stop(self) -> None:
        return None

    async def send_message(self, thread_id: str, text: str) -> str:
        self.sent.append((thread_id, text))
        self.next_message_id += 1
        return str(self.next_message_id)

    async def edit_message(self, thread_id: str, message_id: str, text: str) -> None:
        self.edits.append((thread_id, message_id, text))

    async def push_approval(self, approval: PendingApproval) -> str:
        self.approvals.append(approval)
        self.next_message_id += 1
        return str(self.next_message_id)

    def on_command(self, name: str, handler: Any) -> None:
        self.cmd_handlers[name] = handler

    def on_button(self, handler: Any) -> None:
        self.button_handler = handler


def _make_session(tmp_path: Path) -> tuple[ChatSession, _FakeBridge]:
    bridge = _FakeBridge()
    session = ChatSession(
        bridge=bridge,
        bindings=BindingStore(tmp_path),
        allow_list=AllowList(users={"7"}),
        workdir=tmp_path,
        dispatcher=_TaskDispatcher(workdir=tmp_path),
    )
    session.install_handlers()
    return session, bridge


def test_handoff_emit_writes_token(tmp_path: Path) -> None:
    """``/handoff`` (no args) issues a token bound to the active session."""
    session, bridge = _make_session(tmp_path)
    session.bindings.put(
        Binding(
            platform="telegram",
            thread_id="42",
            session_id="sess-old",
            task_id="t-old",
            adapter="claude",
            goal="Fix the bug",
        ),
    )

    async def scenario() -> None:
        await bridge.cmd_handlers["handoff"](
            ChatMessage(thread_id="42", user_id="7", text="/handoff"),
        )

    asyncio.run(scenario())

    tokens = HandoffTokenStore(tmp_path).all()
    assert len(tokens) == 1
    assert tokens[0].session_id == "sess-old"
    assert tokens[0].source_surface == "chat"
    # Bridge should have surfaced the token to the user.
    assert any("Handoff token" in text for _, text in bridge.sent)


def test_handoff_claim_rebinds_thread(tmp_path: Path) -> None:
    """``/handoff <token>`` rebinds the chat thread to the issued session."""
    # Pre-issue a token via the store, simulating another surface.
    issued = HandoffTokenStore(tmp_path).issue(
        session_id="sess-shared",
        task_id="t-shared",
        source_surface="terminal",
    )
    StreamTailBuffer(tmp_path, "sess-shared").append(surface="terminal", text="hello from terminal")

    session, bridge = _make_session(tmp_path)

    async def scenario() -> None:
        await bridge.cmd_handlers["handoff"](
            ChatMessage(
                thread_id="42",
                user_id="7",
                text=f"/handoff {issued.token}",
                args=[issued.token],
            ),
        )

    asyncio.run(scenario())

    binding = session.bindings.get("telegram", "42")
    assert binding is not None
    assert binding.session_id == "sess-shared"
    assert binding.task_id == "t-shared"
    # Tail line is replayed.
    assert any("hello from terminal" in text for _, text in bridge.sent)


def test_handoff_claim_unknown_token_replies_with_error(tmp_path: Path) -> None:
    """An unknown token surfaces a friendly error rather than raising."""
    _, bridge = _make_session(tmp_path)

    async def scenario() -> None:
        await bridge.cmd_handlers["handoff"](
            ChatMessage(
                thread_id="42",
                user_id="7",
                text="/handoff nope",
                args=["nope"],
            ),
        )

    asyncio.run(scenario())
    assert any("Unknown handoff token" in text for _, text in bridge.sent)


def test_handoff_emit_without_active_session_replies_with_error(tmp_path: Path) -> None:
    """Emitting from a thread with no binding yields a guidance message."""
    _, bridge = _make_session(tmp_path)

    async def scenario() -> None:
        await bridge.cmd_handlers["handoff"](
            ChatMessage(thread_id="42", user_id="7", text="/handoff"),
        )

    asyncio.run(scenario())
    assert any("No active session" in text for _, text in bridge.sent)
    assert HandoffTokenStore(tmp_path).all() == []
