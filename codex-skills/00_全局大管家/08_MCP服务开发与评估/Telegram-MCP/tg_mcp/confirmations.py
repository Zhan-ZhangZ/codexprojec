import time
import uuid
from dataclasses import dataclass
from typing import Any


@dataclass(frozen=True)
class PendingAction:
    token: str
    tool_name: str
    arguments: dict[str, Any]
    summary: str
    created_at: float
    expires_at: float

    def to_dict(self) -> dict[str, Any]:
        return {
            "confirmation_token": self.token,
            "tool_name": self.tool_name,
            "arguments": self.arguments,
            "summary": self.summary,
            "created_at": self.created_at,
            "expires_at": self.expires_at,
        }


class ConfirmationStore:
    def __init__(self, ttl_seconds: int = 600, max_pending: int = 100):
        self.ttl_seconds = ttl_seconds
        self.max_pending = max_pending
        self._actions: dict[str, PendingAction] = {}

    def prepare(self, *, tool_name: str, arguments: dict[str, Any], summary: str) -> PendingAction:
        self._cleanup()
        if len(self._actions) >= self.max_pending:
            raise RuntimeError("Too many pending Telegram actions. Confirm or cancel existing actions first.")

        now = time.time()
        action = PendingAction(
            token=uuid.uuid4().hex,
            tool_name=tool_name,
            arguments=arguments,
            summary=summary,
            created_at=now,
            expires_at=now + self.ttl_seconds,
        )
        self._actions[action.token] = action
        return action

    def pop(self, token: str) -> PendingAction:
        self._cleanup()
        action = self._actions.pop(token, None)
        if action is None:
            raise KeyError("Unknown or expired confirmation token")
        return action

    def cancel(self, token: str) -> PendingAction:
        return self.pop(token)

    def list(self) -> list[dict[str, Any]]:
        self._cleanup()
        return [action.to_dict() for action in self._actions.values()]

    def _cleanup(self) -> None:
        now = time.time()
        for token in [token for token, action in self._actions.items() if action.expires_at <= now]:
            self._actions.pop(token, None)
