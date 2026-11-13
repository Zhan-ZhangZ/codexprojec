# Windows / 中国网络环境踩坑与修复

本配方的脚本已内置大部分修复。此文件记录「为什么」，便于换机器/换环境时排障。
环境基线：Windows + Git Bash（POSIX sh）、Python 3.14、ffmpeg 9.x（gyan.dev full build）、纯 CPU（无 CUDA）。

## 1. 依赖安装慢 / 超时

默认 PyPI 在国内慢。用清华镜像：

```
python -m pip install -i https://pypi.tuna.tsinghua.edu.cn/simple faster-whisper pillow numpy
```

ffmpeg/ffprobe 需在 PATH（gyan.dev full build 或 scoop/choco 安装）。

## 2. httpx `InvalidURL: Invalid port: ':1]'`

`NO_PROXY=localhost,127.0.0.1,[::1],::1` 里的 `[::1],::1` 被 httpx 误解析。
**修复**：ASR 前剥离所有代理环境变量（`transcribe.py` 已做）：

```python
for k in list(os.environ):
    if k.lower() in ("no_proxy","http_proxy","https_proxy","all_proxy"):
        os.environ.pop(k, None)
```

## 3. HuggingFace 模型下载 `CAS Client Error / Format error ... decoding response body`

hf-mirror 的 Xet/CAS 重构失败。**修复**（`transcribe.py` 已做）：

```
HF_ENDPOINT=https://hf-mirror.com
HF_HUB_DISABLE_XET=1
HF_HUB_ENABLE_HF_TRANSFER=0
```

若缓存已损坏（如 `models--Systran--faster-whisper-medium` 半截），删除该缓存目录后重下。

## 4. faster-whisper `TypeError: open() got an unexpected keyword argument 'metadata_errors'`

faster-whisper 1.2.x 与 av>=19 的 API 不兼容。**修复**：不用 av 解码，改用 ffmpeg 解码成
16k 单声道 float32 ndarray 再喂给 `transcribe`（`transcribe.py` 已做）：

```
ffmpeg -i <media> -f f32le -ac 1 -ar 16000 -   ->  np.frombuffer(..., float32)
```

## 5. `RuntimeError: Library cublas64_12.dll is not found`

torch 是 CPU 构建但 faster-whisper 默认尝试 GPU。**修复**：显式 CPU + int8：

```python
WhisperModel(model, device="cpu", compute_type="int8", cpu_threads=8)
```

## 6. CPU 上 medium + beam5 + 32 线程极慢甚至卡死（~0.13x 实时）

线程过多反而 thrash。**修复**：`model=small`、`beam_size=1`、`cpu_threads=8`（≈1x 实时，质量足够选句）。
卡死的进程用 `taskkill //F //PID <pid>` 杀（Git Bash 里 **双斜杠** `//F`，单 `/F` 会被 MSYS 当成路径 `F:/`）。

## 7. python subprocess 里 `/c/Users/...` 打不开

MSYS 路径转换只发生在 shell 层，python `subprocess` 不做转换。**修复**：传给 ffmpeg 的路径用
`C:/Users/...` 正斜杠 Windows 形式，不要用 `/c/Users/...`。

## 8. 削波：loudnorm 后 volumedetect 仍 max 0.0 dB

loudnorm 的 TP 目标在某些素材上仍会顶到 0。**修复**：loudnorm 后串一个硬限幅器：

```
loudnorm=I=-16:TP=-2.0:LRA=11,alimiter=limit=0.891:level=false
```

实测 max ≈ -1.7 dB（安全）。`level=false` 防止 alimiter 自动增益把电平又抬回去。

## 9. GBK 控制台打印中文 `UnicodeEncodeError` / 乱码

Windows 控制台默认 GBK。**修复**：运行 python 时设 `PYTHONIOENCODING=utf-8`。
父脚本用 `subprocess(..., text=True)` 捕获子脚本 UTF-8 输出时，显式 `encoding="utf-8", errors="replace"`，
否则按 GBK 解码会 mojibake（仅显示问题，不影响写盘）。

## 10. Git Bash 工具别名 / shim 陷阱

- `mkdir -p` 失败（scoop shim 不支持 -p）→ 用 `/usr/bin/mkdir -p`。
- `grep` 被 alias 到 rg → 用 `command grep -e ... -e ...`。
- 每条 Bash 命令后 cwd 会重置 → 脚本里用绝对路径，或命令内 `cd` 一次。
- `taskkill /F` → `taskkill //F`（见 #6）。

## 11. 收尾画面弱（低头/弯腰/戴帽）

联系表/末帧检查发现最后一帧不是强 CTA。**修复**：回 EDL，把主播站姿正对镜头/指镜头/举产品的块
挪到列表末尾（即使原片时间上不在最后），重渲染。本案例把 (315.71,320.51)「上车一号链接已加」移到末尾。