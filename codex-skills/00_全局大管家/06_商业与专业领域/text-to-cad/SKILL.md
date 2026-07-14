---
name: text-to-cad
description: Build123d 引擎级拓扑 Python CAD 参数化建型编译器。跳过传统几何约束 GUI，直接利用 Python 脚本进行工业级实体渲染与装配。支持全自动导出 STEP/STL/GLB 及机器人专用的 URDF 工业图纸。Leading Words: Build123d引擎拓扑建模, Python CAD参数化脚本, URDF机器人图纸导出, 工业级STEP渲染
---

# Text-to-CAD 📐

Generate, edit, and export parametric 3D CAD models from natural language prompts using python scripts and the `build123d` geometry engine.

- **Project Homepage**: https://github.com/earthtojake/text-to-cad

## Installation

```bash
# Clone the repository
git clone https://github.com/earthtojake/text-to-cad.git

# Install dependencies (requires Python 3.9+)
pip install build123d ocp requests
```

## Core Capabilities

- **Parametric Modeling**: Generates editable Python scripts defining the 3D model instead of static mesh files, allowing easy adjustments.
- **Support for Industry Formats**: Exporters for **STEP**, **STL**, **3MF**, **GLB**, **DXF**, and **URDF**.
- **Robotics Integration**: Custom skills for generating URDF models and validating joint descriptions.
- **Local Visualization**: React/Vite-based CAD Explorer to inspect generated parts locally.

## Usage Workflow

### Step 1: Prompt & Design
Accept natural language prompts describing a 3D geometry part (e.g., "a custom L-bracket with 5mm screw holes").

### Step 2: Code Generation
Create or edit a python model file inside the `models/` directory using the `build123d` library framework.

```python
# Example build123d geometry script
from build123d import *

with BuildPart() as bracket:
    Box(50, 50, 10)
    # Add features, holes, fillets...
```

### Step 3: Compile & Validate
Run the script to compile the geometry and export it to the desired format (typically `.step` or `.stl`).

```bash
python3 models/my_bracket.py
```

### Step 4: Local Preview
Open the local CAD Explorer in your browser to inspect the 3D visual rendering of the generated part.
