# chubbyskills 本地携带补丁清单

> 集成版本：上游 chubbyguan/chubbyskills v0.13.0（2026-01-24）
> 本清单记录集成后在本地维护、未回传上游的补丁。**下次同步上游新版本时，
> 必须逐条对照：已被上游修复的可丢弃，未修复的需重新套用。**
> 发现渠道：codex-skills-mcp 子代理端到端实测（2026-09-24，见 MCP 仓库 docs/CHANGELOG.md 三、四轮）。

| # | 补丁 | 文件 | 性质 | 上游状态 |
|---|------|------|------|----------|
| P1 | `tools/check_env.py` 补齐 | tools/check_env.py | **集成遗漏修复**（上游本有，搬运时被当 dev 制品删掉；doctor 运行时依赖它）| 从上游 main 原样恢复 |
| P2 | init 相对路径锚定到 config 所在目录 | tools/chubby.py | 上游缺陷：外部 --config 时运行时目录污染技能安装目录 | 上游未修 |
| P3 | brief 原文链接 realpath 归一 | tools/evidence_brief.py | 上游缺陷：macOS 符号链接下产生 `../../private/...` 怪路径 | 上游未修 |
| P4 | setup.sh PEP 668 回退（自动建 .venv） | setup.sh | 上游缺陷：Homebrew/Debian Python 直接 pip 必失败 | 上游未修 |
| P5 | init 幂等铺设 vault-template 骨架 | tools/chubby.py | 上游缺陷：新 vault 缺分区/模板/仪表盘 | 上游未修 |
| P6 | setup.sh 尾部建议只保留存在的命令 | setup.sh | 集成适配：install_skill.py 等系集成策略删除的 dev 制品，不再推荐 | 集成特有 |
| P7 | 检索修复：FTS 逐词 AND + LIKE 兜底逐词 AND | tools/vault_index.py | 上游缺陷：unicode61 把无标点中文段当单 token，整串短语/子串查询大量落空 | 上游未修 |

## 验证记录（2026-09-24）

- P1：doctor 全平台体检输出正常，exit 0
- P2/P5：`init --config /tmp/x/chubby.yaml --vault /tmp/x/vault` → 运行时目录落 config 旁、7 个骨架文件落 vault、重跑不覆盖已有内容
- P3：brief 链接为正常 vault 相对路径，解码后存在
- P4：Homebrew Python 下 `setup.sh wechat` 自动建 .venv 并装齐 bs4/markitdown/pymupdf
- P6：尾部建议仅剩 check_env / quickstart 两条可用命令
- P7：`search "图书馆 指尖"` / "视障 盲文" / 单词 全部命中（修复前多词必失败）
