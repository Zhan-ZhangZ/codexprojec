#!/bin/bash
# 导入字幕 skill · 安装 & 启动 CapCut Mate 服务
# 幂等：已装跳过，已起不重起
set -e

SKILL_DIR="$(cd "$(dirname "$0")/.." && pwd)"
REPO_DIR="$SKILL_DIR/capcut-mate"
VENV="$REPO_DIR/.venv"
DRAFT_DIR="$HOME/Movies/JianyingPro/User Data/Projects/com.lveditor.draft"
PORT=30000

# 1. 克隆仓库
if [ ! -d "$REPO_DIR" ]; then
  echo "==> clone capcut-mate..."
  git clone --depth 1 https://github.com/Hommy-master/capcut-mate.git "$REPO_DIR"
fi

# 2. 打花字补丁（上游 bug: processed_item 漏 text_effect 字段）
CAPTIONS_PY="$REPO_DIR/src/service/add_captions.py"
if ! grep -q '"text_effect": item.get("text_effect"' "$CAPTIONS_PY"; then
  echo "==> patch: text_effect 字段丢失 bug"
  # 在 loop_animation_duration 那行后插入 text_effect
  python3 - <<PY
p="$CAPTIONS_PY"
s=open(p).read()
old='"loop_animation_duration": item.get("loop_animation_duration", None)\n        }'
new='"loop_animation_duration": item.get("loop_animation_duration", None),\n            "text_effect": item.get("text_effect", None),\n        }'
if old in s:
    open(p,'w').write(s.replace(old,new,1))
    print("patched")
else:
    print("skip: pattern not found (上游已修?)")
PY
fi

# 3. 把 DRAFT_DIR 改到剪映 Projects（macOS 沙盒读不了 /tmp）
CONFIG_PY="$REPO_DIR/config.py"
if ! grep -q 'JianyingPro/User Data/Projects' "$CONFIG_PY"; then
  echo "==> patch: DRAFT_DIR 指向剪映 Projects"
  python3 - <<PY
p="$CONFIG_PY"
s=open(p).read()
old='DRAFT_DIR = os.path.join(PROJECT_ROOT, "output", "draft")'
new='DRAFT_DIR = os.path.expanduser("~/Movies/JianyingPro/User Data/Projects/com.lveditor.draft")'
open(p,'w').write(s.replace(old,new,1))
print("patched")
PY
fi

# 4. 建 venv + 装依赖
if [ ! -d "$VENV" ]; then
  echo "==> create venv..."
  PY311=$(command -v python3.11 || command -v python3)
  "$PY311" -m venv "$VENV"
  "$VENV/bin/pip" install -q --upgrade pip
  "$VENV/bin/pip" install -q fastapi "uvicorn[standard]" pymediainfo requests email-validator cos-python-sdk-v5 pillow
fi

# 5. 确保 DRAFT_DIR 存在
mkdir -p "$DRAFT_DIR"

# 6. 启服务（已起则跳过）
if lsof -ti:$PORT >/dev/null 2>&1; then
  echo "==> service already running on :$PORT"
else
  echo "==> start service on :$PORT"
  cd "$REPO_DIR"
  nohup "$VENV/bin/python" main.py > "$SKILL_DIR/capcut-mate.log" 2>&1 &
  sleep 2
  if ! curl -sf http://localhost:$PORT/docs >/dev/null; then
    echo "❌ service failed to start. check $SKILL_DIR/capcut-mate.log"
    exit 1
  fi
fi

echo "✅ capcut-mate ready at http://localhost:$PORT"
echo "   draft dir: $DRAFT_DIR"
