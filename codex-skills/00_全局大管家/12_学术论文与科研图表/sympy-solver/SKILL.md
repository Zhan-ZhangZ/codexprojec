---
name: sympy-solver
description: 纯本地 Python SymPy 符号代数超算沙盒引擎。通过硬编码数学公理法则处理微积分、拓扑矩阵与高阶极限定理，输出可直接渲染的 LaTeX 证明。物理隔离语言模型的数学幻觉，提供绝对保真的数理推导。Leading Words: 纯本地SymPy符号代数超算, 物理隔离大模型数学幻觉, 高阶极限微积分方程求解, LaTeX证明绝对保真推导
---

# SymPy 符号代数求解 (sympy-solver)

## 概述

大语言模型（LLM）在理解复杂微积分、矩阵特征值以及高次代数方程时，极易发生“幻觉”（即计算错误）。`sympy-solver` 允许 AI 代理和用户将复杂的数学符号运算委托给成熟的 Python SymPy 符号计算引擎。

该技能不仅提供精确无误的代数结果，还会自动生成可以直接插入到 LaTeX 论文或 Markdown 报告中的格式化公式公式。

## 何时使用该技能

当用户提出以下需求时，应使用该技能：
- 求解复杂的符号微分或高阶求导。
- 求解定积分（包括带有无穷大 `oo` 或 `pi` 的积分）或不定积分。
- 求解线性或非线性代数方程组（如多元一次方程组、多元二次方程组）。
- 计算矩阵的行列式（det）、逆矩阵（inv）或特征值与特征向量（eigen）。
- 求解复杂的极限问题（包含单侧极限）。
- 化简复杂的三角函数、对数或指数代数表达式。

## 快速上手指南

### 命令行运行

可以直接在终端运行附带的 Python 脚本：

```bash
# 1. 化简代数表达式
python3 scripts/solve_math.py simplify "(x**2 - y**2)/(x - y)" --vars "x,y"

# 2. 对函数进行符号求导
python3 scripts/solve_math.py diff "sin(x)*exp(x)" --var "x" --order 2

# 3. 求解不定积分
python3 scripts/solve_math.py integrate "1/(x**2 + 1)" --var "x"

# 4. 求解定积分 (0 到正无穷 oo)
python3 scripts/solve_math.py integrate "exp(-x**2)" --var "x" --limits "0,oo"

# 5. 求解方程组
python3 scripts/solve_math.py solve "x**2 - 4 = 0" --vars "x"
python3 scripts/solve_math.py solve "x + y - 3, x - y - 1" --vars "x,y"

# 6. 求解极限 (x 趋于 0)
python3 scripts/solve_math.py limit "sin(x)/x" "0" --var "x"

# 7. 矩阵计算 (特征值和特征向量)
python3 scripts/solve_math.py matrix "[[1, 2], [2, 1]]" eigen
```

### 参数说明

使用 `python3 scripts/solve_math.py --help` 查看各个子命令（`simplify`, `diff`, `integrate`, `solve`, `limit`, `matrix`）的详细帮助信息。

## 核心原则与最佳实践

1. **规避模型幻觉**
   - 只要涉及代数变形、求导、积分或矩阵，AI 代理应当 **自动调用** 本脚本，而非自己尝试心算或推导。

2. **支持隐式乘法**
   - 脚本内置了解析器的隐式乘法转换，因此写 `2x` 会被自动理解为 `2*x`，但为了 100% 安全，建议使用显式乘法 `2*x`。

3. **符号与常量的定义**
   - 常见的无穷大表示为 `oo` 或 `inf`。
   - 圆周率表示为 `pi`。
   - 自然对数的底表示为 `e`。

## 常见任务

### 任务 1：求解复杂的二重积分或重积分步骤

*输入*: "帮我求一下函数 $f(x) = x \cdot e^{-x}$ 在 $[0, \infty)$ 区间上的定积分，并给出 LaTeX 表达形式。"

*执行步骤*:
1. 运行：`python3 scripts/solve_math.py integrate "x*exp(-x)" --var "x" --limits "0,oo"`
2. 捕获输出：
   ```latex
   \int_{0}^{\infty} x e^{-x} \, dx = 1
   ```
3. 将精确的定积分计算过程及 LaTeX 渲染结果提供给用户。
