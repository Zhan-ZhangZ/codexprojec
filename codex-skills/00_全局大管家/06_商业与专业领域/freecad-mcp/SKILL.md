---
name: freecad-mcp
description: FreeCAD 3D 机械图纸参数化建模拓扑生成器 (MCP)。完全舍弃 GUI，使用自然语言驱动底层的拓扑特征引擎完成拉伸、布尔打孔、倒角倒圆角操作，并支持无头环境大批量转换 STEP/STL 制造级模型。Leading Words: 3D机械参数化建模, FreeCAD拓扑特征引擎, 自然语言驱动布尔打孔, STEP/STL无头批量生成
---

# FreeCAD MCP — 3D 参数化建模与自动化

- **项目主页**: https://github.com/contextform/freecad-mcp

## 功能说明

`freecad-mcp` 将 AI 大模型接入开源的 3D 机械设计软件 FreeCAD。这使得大语言模型可以作为副驾驶，通过 Python API 接口控制 FreeCAD，自动完成零件设计、特征叠加和文件格式转换。

### 适用软件
- FreeCAD (开源 3D CAD)

### 核心能力
- **基础实体建模**：创建长方体、圆柱体、球体等基础零件。
- **特征工程**：支持布尔运算（加/减实体）、拉伸（Pad）、倒角（Fillet）和倒角（Chamfer）。
- **自动化管线（无头模式）**：无需打开图形界面，后台批量化执行宏（Macro）或者进行格式转换（如将大批量 STEP 转换为 3D 打印所需的 STL）。
- **交互设计**：可以通过文本不断对模型进行参数化微调，实现“文字对话即建模”。

## 使用条件

- 操作系统：Windows / macOS / Linux 均可。
- 已安装 FreeCAD，并正确配置了 FreeCAD 的 Python 环境路径。
- 环境安装了 `mcp` 等必要的 Python 依赖包。

## 注意事项

- 本项目仍处于早期快速迭代阶段，偶尔可能在复杂的草图拉伸中遇到拓扑命名问题，建议用于结构相对清晰的基础结构件设计。
- 升级 Python SDK 时需注意库的兼容性。

## 详细指南

关于安装步骤和运行所需配置，请参考本地代码库中的 `README.md`。
