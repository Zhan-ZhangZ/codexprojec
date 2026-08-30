from __future__ import annotations

import json
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch


PROJECT_ROOT = Path(__file__).resolve().parent.parent
SCRIPTS_DIR = PROJECT_ROOT / "scripts"
if str(SCRIPTS_DIR) not in sys.path:
    sys.path.insert(0, str(SCRIPTS_DIR))
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from shared.comfy_mcp import (  # noqa: E402
    ComfyMcpError,
    _runtime_site_packages,
    _tool_descriptor,
    _tool_payload,
    resolve_connection,
)
from ui.services import UIStorageService  # noqa: E402


class _Model:
    def __init__(self, payload):
        self.payload = payload

    def model_dump(self, mode="python"):
        return self.payload


class _Result:
    def __init__(self, *, structured=None, content=None, is_error=False):
        self.structuredContent = structured
        self.content = content or []
        self.isError = is_error


class _Text:
    def __init__(self, text):
        self.text = text


class ComfyMcpConfigurationTests(unittest.TestCase):
    def test_connection_uses_server_url_and_runtime_overrides(self):
        server = {
            "url": "http://127.0.0.1:8190",
            "mcp_command": "configured-mcp",
            "mcp_args": ["--example"],
            "mcp_python": "configured-python",
            "mcp_cwd": "configured-cwd",
            "mcp_env": {"COMFY_BIN": "configured-comfy", "EMPTY": ""},
        }

        connection = resolve_connection(
            server,
            command="override-mcp",
            python="override-python",
            cwd="override-cwd",
            extra_env={"COMFY_PROJECT": "project-path"},
        )

        self.assertEqual(connection.command, "override-mcp")
        self.assertEqual(connection.args, ["--example"])
        self.assertEqual(connection.python, "override-python")
        self.assertEqual(connection.cwd, "override-cwd")
        self.assertEqual(connection.env["COMFY_WHERE"], "local")
        self.assertEqual(connection.env["COMFY_LOCAL_URL"], "http://127.0.0.1:8190")
        self.assertEqual(connection.env["COMFY_PROJECT"], "project-path")
        self.assertNotIn("EMPTY", connection.env)
        self.assertIn("127.0.0.1", connection.env["NO_PROXY"])
        self.assertIn("localhost", connection.env["NO_PROXY"])

    def test_remote_server_uses_official_remote_target_variable(self):
        with patch.dict(
            "os.environ",
            {
                "COMFY_LOCAL_URL": "http://stale-local:8188",
                "COMFYUI_HOST": "stale-host",
                "COMFYUI_PORT": "9999",
            },
            clear=False,
        ):
            connection = resolve_connection({"url": "http://10.0.0.8:8188"})

        self.assertEqual(connection.env["COMFYUI_URL"], "http://10.0.0.8:8188")
        self.assertNotIn("COMFY_LOCAL_URL", connection.env)
        self.assertNotIn("COMFYUI_HOST", connection.env)
        self.assertNotIn("COMFYUI_PORT", connection.env)

    def test_invalid_mcp_args_fail_before_starting_process(self):
        with self.assertRaisesRegex(ComfyMcpError, "mcp_args"):
            resolve_connection({"mcp_args": "--not-a-list"})


class ComfyMcpPayloadTests(unittest.TestCase):
    def test_structured_tool_result_is_returned_as_json(self):
        result = _Result(structured=_Model({"running": True}))
        self.assertEqual(_tool_payload(result), {"running": True})

    def test_text_json_tool_result_is_decoded(self):
        result = _Result(content=[_Text(json.dumps({"valid": True}))])
        self.assertEqual(_tool_payload(result), {"valid": True})

    def test_tool_error_is_not_treated_as_success(self):
        result = _Result(content=[_Text("missing model")], is_error=True)
        with self.assertRaisesRegex(ComfyMcpError, "missing model"):
            _tool_payload(result)

    def test_tool_descriptor_keeps_live_schema_fields(self):
        tool = _Model(
            {
                "name": "search_templates",
                "description": "Search the current template catalog.",
                "inputSchema": {
                    "type": "object",
                    "required": ["query"],
                    "properties": {"query": {"type": "string"}, "limit": {"type": "integer"}},
                },
            }
        )
        descriptor = _tool_descriptor(tool)
        self.assertEqual(descriptor["name"], "search_templates")
        self.assertEqual(descriptor["required"], ["query"])
        self.assertEqual(descriptor["parameters"], ["query", "limit"])


class ComfyMcpRuntimeTests(unittest.TestCase):
    def test_finds_windows_virtualenv_site_packages(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            env_root = Path(temp_dir) / "venv"
            site_packages = env_root / "Lib" / "site-packages"
            site_packages.mkdir(parents=True)

            self.assertEqual(
                _runtime_site_packages(env_root / "Scripts" / "python.exe"),
                [site_packages],
            )

    def test_finds_posix_virtualenv_site_packages(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            env_root = Path(temp_dir) / "venv"
            site_packages = env_root / "lib" / "python3.12" / "site-packages"
            site_packages.mkdir(parents=True)

            self.assertEqual(
                _runtime_site_packages(env_root / "bin" / "python"),
                [site_packages],
            )


class McpConfigPreservationTests(unittest.TestCase):
    def test_full_config_save_preserves_mcp_fields_omitted_by_old_frontend(self):
        current = {
            "servers": [
                {
                    "id": "local",
                    "name": "Local",
                    "url": "http://127.0.0.1:8188",
                    "mcp_command": "C:/tools/comfy-mcp.exe",
                    "mcp_args": ["serve"],
                    "mcp_python": "C:/tools/python.exe",
                    "mcp_cwd": "C:/tools",
                    "mcp_env": {"COMFY_BIN": "C:/tools/comfy.exe"},
                }
            ],
            "default_server": "local",
        }
        incoming = {
            "servers": [
                {
                    "id": "local",
                    "name": "Renamed",
                    "url": "http://127.0.0.1:8188",
                }
            ]
        }
        service = UIStorageService()

        with patch("ui.services._read_json", return_value=current), patch(
            "ui.services._write_json"
        ) as write_json:
            saved = service.save_config(incoming)

        saved_server = saved["servers"][0]
        self.assertEqual(saved["default_server"], "local")
        self.assertEqual(saved_server["mcp_command"], "C:/tools/comfy-mcp.exe")
        self.assertEqual(saved_server["mcp_args"], ["serve"])
        self.assertEqual(saved_server["mcp_python"], "C:/tools/python.exe")
        self.assertEqual(saved_server["mcp_cwd"], "C:/tools")
        self.assertEqual(saved_server["mcp_env"]["COMFY_BIN"], "C:/tools/comfy.exe")
        write_json.assert_called_once()

    def test_regular_server_update_preserves_mcp_settings(self):
        config = {
            "servers": [
                {
                    "id": "local",
                    "name": "Local",
                    "url": "http://127.0.0.1:8188",
                    "mcp_command": "C:/tools/comfy-mcp.exe",
                    "mcp_python": "C:/tools/python.exe",
                    "mcp_env": {"COMFY_BIN": "C:/tools/comfy.exe"},
                }
            ],
            "default_server": "local",
        }
        service = UIStorageService()

        with patch.object(service, "get_config", return_value=config), patch.object(
            service, "save_config", side_effect=lambda value: value
        ):
            updated = service.update_server("local", {"name": "Local GPU"})

        self.assertEqual(updated["name"], "Local GPU")
        self.assertEqual(updated["mcp_command"], "C:/tools/comfy-mcp.exe")
        self.assertEqual(updated["mcp_python"], "C:/tools/python.exe")
        self.assertEqual(updated["mcp_env"]["COMFY_BIN"], "C:/tools/comfy.exe")


if __name__ == "__main__":
    unittest.main()
