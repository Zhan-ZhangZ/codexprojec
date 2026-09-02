---
name: humanize-text
description: AI 文本去机甲化（Humanizer）与防溯源转换工具。自动重塑 AI 生成的内容，使其呈现人类自然行文韵律，绕过市面上各种反 AI 检测器。Leading Words: 文本去AI化, 绕过AI检测, 自然语言韵律重塑, 机器味消除
metadata:
  version: 1.5.2
  upstream: github.com/lynote-ai/humanize-text
---

# humanize-text

Python 文本去 AI 化管线（v1.5.2，MIT）。执行前**先读 [README.md](README.md)** 获取完整安装与配置说明，配置参考 [docs/configuration.md](docs/configuration.md)，管线原理见 [docs/pipeline.md](docs/pipeline.md)。

## 两条能力线

- **Standard Pipeline（v1.5 生产链，推荐）**：固定 4 步链 `EN → 中文改写(DeepSeek) → 日语改写(DeepSeek) → 芬兰语(Google) → 回英文(Niutrans)`——两轮 LLM 重写（第二轮携带第一轮作对话历史）+ 两次跨引擎 NMT 跳转，最大化语言距离以打散单一引擎的结构指纹，同时保留原文风格。
- **v1.0 四方法参考实现**（`src/methodologies/`）：翻译链、多轮 LLM 重写、检测器反馈回路（Binoculars/RoBERTa/统计指纹）、混合引擎翻译。旧入口 `src/methodologies/humanizer.py` 按方法名分发，可选依赖（torch/transformers/fastapi）已改为惰性加载。

## 运行链路

```bash
pip install -r requirements.txt        # 或 pip install -e .（console_scripts: humanize-text）
cd config && cp config.example.toml config.toml && cd ..   # 模板复制为正式配置，填入 API key
python -m src.standard.pipeline --input "待处理的 AI 生成文本"
```

- 配置写在 `config/` 目录下的 `config.toml`（由模板复制而来；`deepseek_api_key`、`niutrans_api_key` 等），部分项支持环境变量覆盖（如 `DEEPSEEK_API_KEY`，全表见 [docs/configuration.md](docs/configuration.md)）；LLM 提供方支持 `deepseek | openrouter | atlascloud | litellm`（extra 安装）。
- 中间跳转语言可经 `[pipeline].intermediate_lang` 更换；每步中间输出随结果 dict 返回，便于审计改写轨迹。
- 无代码路径：导入 [n8n/humanize_standard.json](n8n/humanize_standard.json) 工作流（见 [docs/n8n-guide.md](docs/n8n-guide.md)）；容器路径见 [docker/Dockerfile](docker/Dockerfile) 与 [docker-compose.yml](docker-compose.yml)。

## 异常处理

- 缺 API key / 网络不通：管线在对应步骤报错即停，先补 [docs/faq.md](docs/faq.md) 中列出的 key 再重跑，勿跳步。
- 检测分数是概率性的，本工具不保证改写后必判为人类；学术等场景须遵守所在机构 AI 使用与披露政策（见 [SECURITY.md](SECURITY.md)）。
- 效果对照与期望值管理：[examples/showcase/](examples/showcase/README.md) 提供 5 组端到端输入/输出及各步中间产物。
