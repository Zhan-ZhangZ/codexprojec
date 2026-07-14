import time

import pytest

from tg_mcp.confirmations import ConfirmationStore


def test_prepare_list_and_pop_action():
    store = ConfirmationStore(ttl_seconds=60)
    action = store.prepare(tool_name="send_message", arguments={"chat_id": 1}, summary="send")

    assert store.list()[0]["confirmation_token"] == action.token
    popped = store.pop(action.token)
    assert popped.tool_name == "send_message"
    assert store.list() == []


def test_pop_unknown_token_fails():
    store = ConfirmationStore()

    with pytest.raises(KeyError):
        store.pop("missing")


def test_expired_action_is_removed():
    store = ConfirmationStore(ttl_seconds=0)
    action = store.prepare(tool_name="send_message", arguments={}, summary="send")
    time.sleep(0.01)

    with pytest.raises(KeyError):
        store.pop(action.token)


def test_max_pending_actions_is_enforced():
    store = ConfirmationStore(ttl_seconds=60, max_pending=1)
    store.prepare(tool_name="send_message", arguments={}, summary="send")

    with pytest.raises(RuntimeError):
        store.prepare(tool_name="send_message", arguments={}, summary="send again")
