# Quickstart

This is the current blessed Polywave Codex flow.

Use one terminal. Run these steps sequentially.

## 1. Install prerequisites

Install `polywave-tools`:

```bash
brew install blackwell-systems/tap/polywave-tools
# or
go install github.com/blackwell-systems/polywave-go/cmd/polywave-tools@latest
```

## 2. Install Polywave Codex

From `polywave-codex`:

```bash
./install.sh
```

Then do the required manual step:
- merge the printed hook configuration into your Codex config
- restart Codex

## 3. Verify the install

```bash
./scripts/verify-codex-install
```

## 4. Initialize your target project

```bash
cd your-project
polywave-tools init
```

## 5. Run scout

Start Codex in the project and run:

```
$polywave scout "add a caching layer to the API client"
```

This writes an IMPL manifest.

## 6. Run wave execution

From your shell in the target repo:

```bash
scripts/run-polywave-wave docs/IMPL/IMPL-caching.yaml --wave 1 --repo-dir "$PWD"
```

This is the current blessed wave path.

## Current boundary

Working today:
- `$polywave scout` in-session
- `scripts/run-polywave-wave` from the shell

Not yet a proven production path:
- fully in-session `$polywave wave`
