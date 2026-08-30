<div align="center">
  <img src="./asset/banner.png" alt="ComfyUI Skills Banner">

  <h1>ComfyUI Skills for OpenClaw</h1>

  <p><strong>OpenClaw, Hermes Agent, Codex, Claude Code 및 기타 에이전트를 위한 Agent 친화적 ComfyUI 워크플로우 스킬입니다.</strong></p>

  <p>
    이 프로젝트는 ComfyUI 워크플로우를 호출 가능한 스킬로 변환합니다. Agent 친화적인 CLI를 주 인터페이스로 제공하며,
    설정과 테스트를 위한 시각적 Web UI도 함께 제공합니다.
  </p>

  <p>
    <a href="https://huangyuchuh.github.io/ComfyUI_Skills_OpenClaw/"><img src="https://img.shields.io/badge/docs-GitHub_Pages-4F46E5?style=flat&logo=gitbook&logoColor=white" alt="Docs"></a>
    <a href="https://github.com/HuangYuChuh/ComfyUI_Skills_OpenClaw/blob/main/LICENSE"><img src="https://img.shields.io/github/license/HuangYuChuh/ComfyUI_Skills_OpenClaw?style=flat&color=10B981&logo=data%3Aimage/svg%2Bxml%3Bbase64%2CPHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJ3aGl0ZSIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiPjxwYXRoIGQ9Im0xNiAxNiAzLTggMyA4Yy0uODcuNjUtMS45MiAxLTMgMXMtMi4xMy0uMzUtMy0xWiIvPjxwYXRoIGQ9Im0yIDE2IDMtOCAzIDhjLS44Ny42NS0xLjkyIDEtMyAxcy0yLjEzLS4zNS0zLTFaIi8%2BPHBhdGggZD0iTTcgMjFoMTAiLz48cGF0aCBkPSJNMTIgM3YxOCIvPjxwYXRoIGQ9Ik0zIDdoMmMyIDAgNS0xIDctMiAyIDEgNSAyIDcgMmgyIi8%2BPC9zdmc%2B" alt="License"></a>
    <a href="https://github.com/HuangYuChuh/ComfyUI_Skills_OpenClaw/stargazers"><img src="https://img.shields.io/github/stars/HuangYuChuh/ComfyUI_Skills_OpenClaw?style=flat&color=EAB308&logo=github" alt="GitHub stars"></a>
    <a href="https://github.com/HuangYuChuh/ComfyUI_Skills_OpenClaw/network/members"><img src="https://img.shields.io/github/forks/HuangYuChuh/ComfyUI_Skills_OpenClaw?style=flat&color=F97316&logo=github" alt="GitHub forks"></a>
    <a href="https://www.python.org/"><img src="https://img.shields.io/static/v1?label=Python&message=3.10%2B&color=3B82F6&style=flat&logo=python&logoColor=white" alt="Python 3.10+"></a>
    <a href="https://github.com/NousResearch/hermes-agent"><img src="https://img.shields.io/static/v1?label=Hermes%20Agent&message=compatible&color=8B5CF6&style=flat&logo=data%3Aimage/svg%2Bxml%3Bbase64%2CPHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJ3aGl0ZSIgc3Ryb2tlLXdpZHRoPSIyIj48cGF0aCBkPSJNMTIgMmExMCAxMCAwIDEgMCAwIDIwIDEwIDEwIDAgMCAwIDAtMjBaIi8%2BPHBhdGggZD0iTTggMTRzMS41IDIgNCAyczQtMiA0LTIiLz48L3N2Zz4%3D&logoColor=white" alt="Hermes Agent Compatible"></a>
    <a href="https://agentskills.io"><img src="https://img.shields.io/static/v1?label=agentskills.io&message=standard&color=06B6D4&style=flat" alt="agentskills.io standard"></a>
  </p>

  <p>
    <a href="https://www.bilibili.com/video/BV1a6cUzVEE6/">🎬 데모 영상</a> ·
    <a href="https://huangyuchuh.github.io/ComfyUI_Skills_OpenClaw/">📘 문서</a> ·
    <a href="#quick-start">🧭 빠른 시작</a> ·
    <a href="#cli">⌨️ CLI</a> ·
    <a href="#web-ui">🖥️ Web UI</a> ·
    <a href="#multi-server-management">🛰️ 멀티 서버</a>
  </p>

  <p>
    <a href="./README.md">English</a> ·
    <a href="./README.zh-CN.md">简体中文</a> ·
    <a href="./README.zh-TW.md">繁體中文</a> ·
    <a href="./README.ja.md">日本語</a> ·
    <strong>한국어</strong> ·
    <a href="./README.es.md">Español</a>
  </p>

  <blockquote>이 문서는 기계 번역으로 작성되었습니다. 번역 개선 기여를 환영합니다.</blockquote>
</div>

---

## 개요

ComfyUI Skills for OpenClaw는 ComfyUI 워크플로우를 에이전트가 호출할 수 있는 스킬로 변환하는 Agent 친화적 브릿지입니다.

에이전트가 원시 ComfyUI 그래프를 직접 조작하도록 하는 대신, CLI와 스키마 기반 파라미터 매핑을 통해 각 워크플로우에 깔끔하고 제어 가능한 인터페이스를 제공합니다. 셸 명령을 실행할 수 있는 OpenClaw, Hermes Agent, Codex, Claude Code 및 기타 에이전트와 함께 작동합니다. [agentskills.io](https://agentskills.io) 오픈 표준 호환.

기존 ComfyUI 워크플로우를 가져오고, 필요한 파라미터만 노출하고, 채팅이나 에이전트 작업에서 실행하고, 하나의 일관된 워크플로우 레이어로 모든 것을 관리하고 싶을 때 사용하세요.

| 대상 사용자 | 제공하는 것 |
|-------------|-------------|
| OpenClaw, Hermes Agent, Codex, Claude Code 사용자 | 에이전트가 안전하게 호출할 수 있는 ComfyUI 워크플로우 레이어 |
| 기존 ComfyUI 워크플로우 소유자 | 전체 그래프를 노출하지 않고 내보낸 워크플로우를 재사용하는 방법 |
| 다중 머신 환경 | 로컬 및 원격 ComfyUI 서버를 위한 단일 네임스페이스 |
| 시각적 설정 및 테스트를 원하는 사용자 | 에이전트에 전달하기 전에 워크플로우를 설정, 미리보기, 검증할 수 있는 선택적 Web UI |

## 기능

| 기능 | 가치 |
|------|------|
| **Agent 친화적 CLI** | 에이전트를 위해 설계되었습니다. 원시 ComfyUI 그래프나 저수준 ComfyUI 상호작용 패턴보다 더 깔끔하고 신뢰할 수 있는 인터페이스를 제공합니다. |
| **스키마 기반 파라미터 매핑** | 에이전트가 제어할 필드만 노출하고, 명확한 별칭, 타입, 설명을 제공합니다. |
| **ComfyUI 워크플로우 가져오기** | 워크플로우 JSON 파일을 가져오고, 형식을 자동 감지하며, 에이전트 사용에 필요한 매핑 레이어를 생성합니다. |
| **멀티 서버 라우팅** | 로컬 및 원격 ComfyUI 서버를 하나의 네임스페이스로 관리하고 적절한 머신으로 작업을 라우팅합니다. |
| **의존성 관리** | 실행 전에 누락된 노드와 모델을 확인하고 CLI를 통해 지원되는 의존성을 설치합니다. |
| **선택적 Web UI** | 설정 및 테스트를 위한 시각적 레이어입니다. CLI를 대체하지 않으며, 에이전트 대상 액션은 동일한 CLI 워크플로우에 매핑됩니다. |

<a id="quick-start"></a>
## 빠른 시작

몇 분 만에 ComfyUI Skills를 실행하세요.

시작하기 전에 다음을 준비하세요:

- Python 3.10+
- 실행 중인 ComfyUI 서버
- 바로 실행을 테스트하려면 ComfyUI API 형식으로 내보낸 워크플로우

### 1. 프로젝트 클론

에이전트 환경에 맞는 디렉토리를 선택하세요.

<details>
<summary><strong>OpenClaw 용</strong></summary>

```bash
cd ~/.openclaw/workspace/skills
git clone https://github.com/HuangYuChuh/ComfyUI_Skills_OpenClaw.git comfyui-skill-openclaw
cd comfyui-skill-openclaw
```

</details>

<details>
<summary><strong>Claude Code 용</strong></summary>

```bash
cd ~/.claude/skills
git clone https://github.com/HuangYuChuh/ComfyUI_Skills_OpenClaw.git comfyui-skill
cd comfyui-skill
```

</details>

<details>
<summary><strong>Codex 용</strong></summary>

```bash
cd ~/.codex/skills
git clone https://github.com/HuangYuChuh/ComfyUI_Skills_OpenClaw.git comfyui-skill
cd comfyui-skill
```

</details>

<details>
<summary><strong>Hermes Agent 환경</strong></summary>

```bash
cd ~/.hermes/skills/creative
git clone https://github.com/HuangYuChuh/ComfyUI_Skills_OpenClaw.git comfyui-skill-openclaw
cd comfyui-skill-openclaw
```

Or install via Hermes CLI (once the PR is merged):
```bash
hermes skills install comfyui-skill-openclaw
```

</details>

### 2. 로컬 설정 생성

```bash
cp config.example.json config.json
```

### 3. CLI 설치

```bash
pipx install comfyui-skill-cli
```

또는:

```bash
pip install comfyui-skill-cli
```

이미 CLI가 설치되어 있다면 다음으로 업그레이드하세요:

```bash
# pipx로 설치한 경우
pipx upgrade comfyui-skill-cli

# pip로 설치한 경우
python3 -m pip install -U comfyui-skill-cli
```

### 4. 설정 확인

```bash
comfyui-skill server status
comfyui-skill list
```

### 5. 첫 번째 워크플로우 가져오기 및 실행

```bash
comfyui-skill workflow import /absolute/path/to/my-workflow.json
comfyui-skill deps check local/my-workflow
comfyui-skill run local/my-workflow --args '{"prompt": "a white cat"}'
```

수동 CLI 가져오기 시 워크플로우 JSON의 절대 경로를 전달하는 것을 권장합니다. 경로 모호성을 피하고 스토리지 모델을 단순하게 유지할 수 있습니다.

예시:

```bash
comfyui-skill workflow import /Users/yourname/Downloads/my-workflow.json
```

가져오기 후 CLI는 정규화된 워크플로우와 스키마를 `data/<server_id>/<workflow_id>/` 아래에 저장합니다. 예: `data/local/my-workflow/workflow.json` 및 `data/local/my-workflow/schema.json`.

이것은 Web UI와 Agent/OpenClaw 가져오기에서도 사용하는 공식 레이아웃입니다:

```bash
data/<server_id>/<workflow_id>/
  workflow.json
  schema.json
  history/
```

이 시점에서 CLI는 로컬 `config.json`을 읽고, 사용 가능한 워크플로우를 검색하고, ComfyUI 서버를 통해 실행합니다.

시각적 설정 및 테스트 흐름을 선호한다면 아래의 [Web UI](#web-ui) 섹션을 참조하세요.

## 설정 옵션

사용 방식에 맞는 경로를 선택하세요.

### OpenClaw

OpenClaw가 ComfyUI 워크플로우를 스킬로 검색하고 실행하도록 하려면 이 경로를 사용하세요.

- 리포지토리를 `~/.openclaw/workspace/skills`에 클론
- `comfyui-skill-cli` 설치
- `config.json` 설정
- 워크플로우를 가져오고 에이전트가 안전하게 사용할 수 있는 파라미터 노출

### Codex 또는 Claude Code

코딩 에이전트가 셸 명령을 통해 ComfyUI 워크플로우를 호출하도록 하려면 이 경로를 사용하세요.

- 리포지토리를 에이전트 스킬 디렉토리에 클론
- CLI 설치
- `comfyui-skill list`로 확인
- 구조화된 `--args`로 워크플로우 실행

### Web UI

시각적 인터페이스로 설정, 검사, 테스트를 하고 싶다면 이 경로를 사용하세요. 자세한 내용은 아래의 [Web UI](#web-ui) 섹션을 참조하세요.

### 수동 설정

`config.json`, `workflow.json`, `schema.json`을 직접 제어하고 싶다면 이 경로를 사용하세요.

<details>
<summary><strong>수동 설정 파일 예시 펼치기</strong></summary>

#### 1) `config.json` 편집

```jsonc
{
  "servers": [
    {
      "id": "local",
      "name": "Local",
      "url": "http://127.0.0.1:8188",
      "enabled": true,
      "output_dir": "./outputs"
    }
  ],
  "default_server": "local"
}
```

#### 2) 워크플로우 파일 배치

```text
data/local/my-workflow/
  workflow.json  # ComfyUI API 형식 내보내기
  schema.json    # 파라미터 매핑
```

#### 3) `schema.json` 작성

```jsonc
{
  "description": "My workflow",
  "enabled": true,
  "parameters": {
    "prompt": {
      "node_id": 10,
      "field": "prompt",
      "required": true,
      "type": "string",
      "description": "Prompt text"
    }
  }
}
```

</details>

<a id="cli"></a>
## 자주 사용하는 명령어

[빠른 시작](#quick-start)에서 보여준 명령어 외에 필요할 수 있는 추가 작업입니다:

### 워크플로우 검사

```bash
comfyui-skill info local/txt2img
```

### 워크플로우 비동기 제출

```bash
comfyui-skill submit local/txt2img --args '{"prompt": "a white cat"}'
comfyui-skill status <prompt_id>
```

### 서버 관리

```bash
comfyui-skill server list
comfyui-skill server add --id remote --url http://10.0.0.1:8188
```

전체 CLI 레퍼런스는 `comfyui-skill --help`를 실행하거나 [ComfyUI Skill CLI](https://github.com/HuangYuChuh/ComfyUI_Skill_CLI)를 참조하세요.

## 워크플로우 요구사항

이 프로젝트에서 안정적으로 작동하려면 각 워크플로우가 다음 요구사항을 충족해야 합니다.

- 워크플로우는 ComfyUI에서 API 형식으로 내보내야 합니다.
- 워크플로우에는 `Save Image`와 같은 출력 노드가 포함되어야 합니다.
- 에이전트가 깔끔한 파라미터 인터페이스로 작업할 수 있도록 `schema.json` 매핑이 필요합니다.
- 대상 ComfyUI 서버에 필요한 커스텀 노드와 모델이 설치되어 있어야 합니다.

`comfyui-skill workflow import`를 사용하면 CLI가 필요한 매핑을 생성하고 실행 전에 의존성을 확인할 수 있습니다.

<a id="multi-server-management"></a>
## 멀티 서버 관리

이 프로젝트는 둘 이상의 ComfyUI 서버에서 작동하도록 설계되었습니다.

여러 로컬 또는 원격 ComfyUI 인스턴스를 하나의 설정 아래에 두고 네임스페이스로 워크플로우를 라우팅할 수 있습니다. 경량 로컬 테스트, 대형 GPU 작업, 모델별 환경 등 다른 목적을 가진 머신에 유용합니다.

예시:

```bash
comfyui-skill server add --id local --url http://127.0.0.1:8188
comfyui-skill server add --id remote-a100 --url http://10.0.0.20:8188
comfyui-skill server list
```

워크플로우는 다음 형식으로 주소 지정합니다:

```text
<server_id>/<workflow_id>
```

예시:

```text
local/txt2img
remote-a100/sdxl-base
```

서버와 워크플로우 모두 활성화/비활성화 스위치를 지원하므로, 에이전트는 현재 사용 가능한 워크플로우만 볼 수 있습니다.

다음 명령으로 머신 간 설정을 이동할 수도 있습니다:

```bash
comfyui-skill config export --output ./backup.json
comfyui-skill config import ./backup.json --dry-run
comfyui-skill config import ./backup.json
```

<a id="web-ui"></a>
## Web UI

시각적 설정 및 테스트를 위한 로컬 웹 인터페이스가 제공됩니다. 선택 사항이며, 설정, 검사, 검증을 더 쉽게 하기 위해 존재합니다. 스킬 자체는 에이전트가 CLI를 통해 사용하도록 설계되었습니다.

### 실행

```bash
./ui/run_ui.sh                    # macOS/Linux
# 또는: ui\run_ui.bat               # Windows
```

실행 스크립트는 필요 시 프로젝트 `.venv`를 생성하고 UI 의존성을 해당 가상 환경에 설치합니다. 글로벌 Web UI 의존성 설치는 필요 없습니다.

`http://localhost:18189`를 방문하세요.

### Web UI에서 할 수 있는 것

- ComfyUI에서 내보낸 워크플로우 업로드
- 시각적 편집기로 파라미터 매핑 설정
- 여러 서버와 워크플로우를 한 곳에서 관리
- 워크플로우 정의 검색, 정렬, 검사
- 에이전트에 전달하기 전에 워크플로우 설정 테스트 및 검증
- English, 简体中文, 繁體中文으로 인터페이스 언어 전환

Web UI에서 설정하는 모든 것은 동일한 기반 CLI 워크플로우에 매핑됩니다. 별도의 실행 모델이 아닌 설정 및 테스트를 위한 시각적 동반자입니다.

프론트엔드 소스는 [별도 리포지토리](https://github.com/HuangYuChuh/ComfyUI_Skills_OpenClaw-frontend)에 있습니다.

## 자주 발생하는 문제

### `/prompt`에서 HTTP 400

워크플로우 페이로드 또는 주입된 파라미터 값 중 하나가 유효하지 않습니다.

확인 사항:

- 워크플로우가 API 형식으로 내보내졌는지
- 스키마 매핑이 올바른 노드와 필드를 가리키는지
- 제공된 인수 타입이 스키마와 일치하는지

### 이미지가 반환되지 않음

워크플로우에 `Save Image`와 같은 유효한 출력 노드가 없을 수 있습니다.

### 연결 실패

확인 사항:

- ComfyUI 서버가 실행 중인지
- `config.json`의 서버 URL이 올바른지
- 선택한 서버가 활성화되어 있는지

### 누락된 노드 또는 모델

다음을 실행하세요:

```bash
comfyui-skill deps check <workflow_id>
```

그런 다음 필요한 의존성을 설치하세요.

## 변경 이력

최근 주요 변경사항:

- **v0.4.0**: [CLI 우선 아키텍처](https://github.com/HuangYuChuh/ComfyUI_Skill_CLI)로 마이그레이션 — 모든 워크플로우 작업(`run`, `submit`, `status`, `import`, `deps`)이 독립 CLI 도구를 통해 수행되며, 레거시 Python 스크립트는 제거되었습니다.
- **v0.3.1**: Kling, Sora, Nano Banana 등 클라우드 API 노드를 위한 ComfyUI API Key 지원 추가.
- **v0.3.0**: 의존성 확인 및 설치, 논블로킹 `submit`과 `status`, 이미지 업로드, 가져오기 미리보기, 실행 이력 추가.

전체 릴리스 이력은 [CHANGELOG.md](./CHANGELOG.md)를 참조하세요.

## 기여

기여를 환영합니다! PR을 제출하기 전에 [CONTRIBUTING.md](./CONTRIBUTING.md)를 읽어주세요.

## 관련 자료

- [English README](./README.md)
- [简体中文 README](./README.zh-CN.md)
- [繁體中文 README](./README.zh-TW.md)
- [日本語 README](./README.ja.md)
- [한국어 README](./README.ko.md)
- [Español README](./README.es.md)
- [ComfyUI Skill CLI](https://github.com/HuangYuChuh/ComfyUI_Skill_CLI)
- [Frontend Repository](https://github.com/HuangYuChuh/ComfyUI_Skills_OpenClaw-frontend)
- [Hermes Agent](https://github.com/NousResearch/hermes-agent) — 호환 AI 에이전트 플랫폼
- [agentskills.io](https://agentskills.io) — 오픈 스킬 포맷 표준
