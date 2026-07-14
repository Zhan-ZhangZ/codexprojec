#!/bin/bash
# 关闭 capcut-mate 服务
PORT=30000
PID=$(lsof -ti:$PORT 2>/dev/null)
if [ -n "$PID" ]; then
  kill -9 $PID
  echo "✅ stopped capcut-mate (pid=$PID)"
else
  echo "service not running"
fi
