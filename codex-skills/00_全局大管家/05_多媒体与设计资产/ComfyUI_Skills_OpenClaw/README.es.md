<div align="center">
  <img src="./asset/banner.png" alt="ComfyUI Skills Banner">

  <h1>ComfyUI Skills for OpenClaw</h1>

  <p><strong>Skills de flujo de trabajo ComfyUI amigables con agentes para OpenClaw, Hermes Agent, Codex, Claude Code y otros agentes.</strong></p>

  <p>
    Este proyecto convierte los flujos de trabajo de ComfyUI en skills invocables, con una CLI amigable para agentes como interfaz principal
    y una Web UI visual para facilitar la configuración y las pruebas.
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
    <a href="https://www.bilibili.com/video/BV1a6cUzVEE6/">🎬 Video de demostración</a> ·
    <a href="https://huangyuchuh.github.io/ComfyUI_Skills_OpenClaw/">📘 Documentación</a> ·
    <a href="#quick-start">🧭 Inicio rápido</a> ·
    <a href="#cli">⌨️ CLI</a> ·
    <a href="#web-ui">🖥️ Web UI</a> ·
    <a href="#multi-server-management">🛰️ Multi-servidor</a>
  </p>

  <p>
    <a href="./README.md">English</a> ·
    <a href="./README.zh-CN.md">简体中文</a> ·
    <a href="./README.zh-TW.md">繁體中文</a> ·
    <a href="./README.ja.md">日本語</a> ·
    <a href="./README.ko.md">한국어</a> ·
    <strong>Español</strong>
  </p>

  <blockquote>Este documento fue traducido automáticamente. Las contribuciones para mejorar la traducción son bienvenidas.</blockquote>
</div>

---

## Descripción general

ComfyUI Skills for OpenClaw es un puente amigable para agentes que convierte flujos de trabajo de ComfyUI en skills invocables por agentes.

En lugar de hacer que un agente manipule grafos crudos de ComfyUI, este proyecto proporciona a cada flujo de trabajo una interfaz limpia y controlada a través de una CLI y un mapeo de parámetros basado en esquemas. Funciona con OpenClaw, Hermes Agent, Codex, Claude Code y otros agentes que pueden ejecutar comandos de shell. Compatible con el estándar abierto [agentskills.io](https://agentskills.io).

Úsalo cuando quieras importar flujos de trabajo existentes de ComfyUI, exponer solo los parámetros importantes, ejecutarlos desde el chat o tareas de agentes, y gestionar todo a través de una capa de flujo de trabajo consistente.

| Ideal para | Lo que obtienes |
|------------|-----------------|
| Usuarios de OpenClaw, Hermes Agent, Codex y Claude Code | Una capa de flujo de trabajo ComfyUI que los agentes pueden llamar de forma segura |
| Propietarios de flujos de trabajo ComfyUI existentes | Una forma limpia de reutilizar flujos de trabajo exportados sin exponer el grafo completo |
| Configuraciones multi-máquina | Un namespace unificado para servidores ComfyUI locales y remotos |
| Usuarios que desean configuración y pruebas visuales | Una Web UI opcional para configurar, previsualizar y validar flujos de trabajo antes de que los agentes los usen |

## Características

| Capacidad | Por qué importa |
|-----------|-----------------|
| **CLI amigable para agentes** | Diseñada para agentes, no solo para humanos. Proporciona una interfaz más limpia y confiable que trabajar directamente con grafos crudos de ComfyUI o patrones de interacción de nivel inferior. |
| **Mapeo de parámetros basado en esquemas** | Expone solo los campos que deseas que el agente controle, con alias, tipos y descripciones claras. |
| **Importación de flujos de trabajo ComfyUI** | Importa archivos JSON de flujos de trabajo, detecta formatos automáticamente y genera la capa de mapeo necesaria para el uso del agente. |
| **Enrutamiento multi-servidor** | Gestiona servidores ComfyUI locales y remotos bajo un namespace y enruta trabajos a la máquina correcta. |
| **Gestión de dependencias** | Verifica nodos y modelos faltantes antes de la ejecución e instala dependencias soportadas a través de la CLI. |
| **Web UI opcional** | Una capa visual para configuración y pruebas. No reemplaza la CLI; las acciones orientadas al agente siguen mapeándose al mismo flujo de trabajo CLI. |

<a id="quick-start"></a>
## Inicio rápido

Pon en marcha ComfyUI Skills en unos minutos.

Antes de comenzar, asegúrate de tener:

- Python 3.10+
- Un servidor ComfyUI en ejecución
- Un flujo de trabajo exportado en formato API de ComfyUI si deseas probar la ejecución de inmediato

### 1. Clonar el proyecto

Elige el directorio que corresponda a tu entorno de agente.

<details>
<summary><strong>Para OpenClaw</strong></summary>

```bash
cd ~/.openclaw/workspace/skills
git clone https://github.com/HuangYuChuh/ComfyUI_Skills_OpenClaw.git comfyui-skill-openclaw
cd comfyui-skill-openclaw
```

</details>

<details>
<summary><strong>Para Claude Code</strong></summary>

```bash
cd ~/.claude/skills
git clone https://github.com/HuangYuChuh/ComfyUI_Skills_OpenClaw.git comfyui-skill
cd comfyui-skill
```

</details>

<details>
<summary><strong>Para Codex</strong></summary>

```bash
cd ~/.codex/skills
git clone https://github.com/HuangYuChuh/ComfyUI_Skills_OpenClaw.git comfyui-skill
cd comfyui-skill
```

</details>

<details>
<summary><strong>Para Hermes Agent</strong></summary>

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

### 2. Crear la configuración local

```bash
cp config.example.json config.json
```

### 3. Instalar la CLI

```bash
pipx install comfyui-skill-cli
```

O:

```bash
pip install comfyui-skill-cli
```

Si ya tienes la CLI instalada, actualízala con:

```bash
# Si la instalaste con pipx
pipx upgrade comfyui-skill-cli

# Si la instalaste con pip
python3 -m pip install -U comfyui-skill-cli
```

### 4. Verificar la configuración

```bash
comfyui-skill server status
comfyui-skill list
```

### 5. Importar y ejecutar tu primer flujo de trabajo

```bash
comfyui-skill workflow import /absolute/path/to/my-workflow.json
comfyui-skill deps check local/my-workflow
comfyui-skill run local/my-workflow --args '{"prompt": "a white cat"}'
```

Para importaciones manuales por CLI, se recomienda pasar la ruta absoluta del JSON del flujo de trabajo. Esto evita ambigüedades de ruta y mantiene el modelo de almacenamiento simple.

Por ejemplo:

```bash
comfyui-skill workflow import /Users/yourname/Downloads/my-workflow.json
```

Después de la importación, la CLI almacena el flujo de trabajo normalizado y el esquema en `data/<server_id>/<workflow_id>/`, por ejemplo `data/local/my-workflow/workflow.json` y `data/local/my-workflow/schema.json`.

Este es también el layout formal usado por la Web UI y por las importaciones de Agent/OpenClaw:

```bash
data/<server_id>/<workflow_id>/
  workflow.json
  schema.json
  history/
```

En este punto, la CLI leerá tu `config.json` local, descubrirá los flujos de trabajo disponibles y los ejecutará a través de tu servidor ComfyUI.

Si prefieres un flujo de configuración y pruebas visual, consulta la sección [Web UI](#web-ui) a continuación.

## Opciones de configuración

Elige la ruta que corresponda a cómo deseas usar el proyecto.

### OpenClaw

Usa esta ruta si deseas que OpenClaw descubra y ejecute flujos de trabajo ComfyUI como skills.

- Clona el repositorio en `~/.openclaw/workspace/skills`
- Instala `comfyui-skill-cli`
- Configura `config.json`
- Importa flujos de trabajo y expone parámetros seguros para el agente

### Codex o Claude Code

Usa esta ruta si deseas que agentes de codificación llamen flujos de trabajo ComfyUI mediante comandos de shell.

- Clona el repositorio en el directorio de skills de tu agente
- Instala la CLI
- Verifica con `comfyui-skill list`
- Ejecuta flujos de trabajo con `--args` estructurados

### Web UI

Usa esta ruta si deseas una interfaz visual para configuración, inspección y pruebas. Consulta la sección [Web UI](#web-ui) a continuación para instrucciones de lanzamiento y detalles.

### Configuración manual

Usa esta ruta si deseas control directo sobre `config.json`, `workflow.json` y `schema.json`.

<details>
<summary><strong>Expandir para configuración manual de archivos</strong></summary>

#### 1) Editar `config.json`

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

#### 2) Colocar archivos de flujo de trabajo

```text
data/local/my-workflow/
  workflow.json  # Exportación en formato API de ComfyUI
  schema.json    # Mapeo de parámetros
```

#### 3) Escribir `schema.json`

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
## Comandos comunes

Además de los comandos mostrados en [Inicio rápido](#quick-start), estas son operaciones adicionales que podrías necesitar:

### Inspeccionar un flujo de trabajo

```bash
comfyui-skill info local/txt2img
```

### Enviar un flujo de trabajo de forma asíncrona

```bash
comfyui-skill submit local/txt2img --args '{"prompt": "a white cat"}'
comfyui-skill status <prompt_id>
```

### Gestionar servidores

```bash
comfyui-skill server list
comfyui-skill server add --id remote --url http://10.0.0.1:8188
```

Para la referencia completa de la CLI, ejecuta `comfyui-skill --help` o consulta [ComfyUI Skill CLI](https://github.com/HuangYuChuh/ComfyUI_Skill_CLI).

## Requisitos de flujos de trabajo

Para funcionar de manera confiable con este proyecto, cada flujo de trabajo debe cumplir estos requisitos.

- El flujo de trabajo debe exportarse desde ComfyUI en formato API.
- El flujo de trabajo debe incluir un nodo de salida como `Save Image`.
- El flujo de trabajo necesita un mapeo `schema.json` para que el agente pueda trabajar con una interfaz de parámetros limpia.
- El servidor ComfyUI de destino debe tener instalados los nodos personalizados y modelos requeridos.

Si usas `comfyui-skill workflow import`, la CLI puede ayudar a generar el mapeo necesario y verificar dependencias antes de la ejecución.

<a id="multi-server-management"></a>
## Gestión multi-servidor

Este proyecto está diseñado para funcionar con más de un servidor ComfyUI.

Puedes mantener múltiples instancias locales o remotas de ComfyUI bajo una configuración y enrutar flujos de trabajo por namespace. Esto es útil cuando diferentes máquinas sirven para diferentes propósitos, como pruebas locales ligeras, trabajos con GPU grandes o entornos específicos de modelos.

Ejemplos:

```bash
comfyui-skill server add --id local --url http://127.0.0.1:8188
comfyui-skill server add --id remote-a100 --url http://10.0.0.20:8188
comfyui-skill server list
```

Los flujos de trabajo se direccionan con el formato:

```text
<server_id>/<workflow_id>
```

Por ejemplo:

```text
local/txt2img
remote-a100/sdxl-base
```

Tanto servidores como flujos de trabajo admiten interruptores de activación y desactivación, para que los agentes solo vean los flujos de trabajo actualmente disponibles.

También puedes mover configuraciones entre máquinas con:

```bash
comfyui-skill config export --output ./backup.json
comfyui-skill config import ./backup.json --dry-run
comfyui-skill config import ./backup.json
```

<a id="web-ui"></a>
## Web UI

Una interfaz web local está disponible para configuración y pruebas visuales. Es opcional y existe para facilitar la configuración, inspección y validación. El skill en sí está diseñado para que los agentes lo usen a través de la CLI.

### Lanzamiento

```bash
./ui/run_ui.sh                    # macOS/Linux
# o: ui\run_ui.bat                # Windows
```

Los scripts de lanzamiento crean un `.venv` del proyecto cuando es necesario e instalan las dependencias de la UI en ese entorno virtual. No se requiere instalación global de dependencias de la Web UI.

Visita `http://localhost:18189`.

### Lo que puedes hacer en la Web UI

- Subir flujos de trabajo exportados desde ComfyUI
- Configurar mapeos de parámetros con un editor visual
- Gestionar múltiples servidores y flujos de trabajo en un solo lugar
- Buscar, reordenar e inspeccionar definiciones de flujos de trabajo
- Probar y validar la configuración de flujos de trabajo antes de pasarlos a los agentes
- Usar la interfaz en English, 简体中文 o 繁體中文

Todo lo que la Web UI configura se mapea al mismo flujo de trabajo CLI subyacente. Es un compañero visual para la configuración y las pruebas, no un modelo de ejecución separado.

El código fuente del frontend está en un [repositorio separado](https://github.com/HuangYuChuh/ComfyUI_Skills_OpenClaw-frontend).

## Problemas comunes

### HTTP 400 en `/prompt`

El payload del flujo de trabajo o uno de los valores de parámetros inyectados es inválido.

Verifica:

- Si el flujo de trabajo fue exportado en formato API
- Si el mapeo del esquema apunta al nodo y campo correctos
- Si los tipos de argumentos proporcionados coinciden con el esquema

### No se devuelven imágenes

El flujo de trabajo puede estar faltando un nodo de salida válido como `Save Image`.

### Fallo de conexión

Verifica que:

- El servidor ComfyUI está en ejecución
- La URL del servidor en `config.json` es correcta
- El servidor seleccionado está habilitado

### Nodos o modelos faltantes

Ejecuta:

```bash
comfyui-skill deps check <workflow_id>
```

Luego instala las dependencias soportadas si es necesario.

## Registro de cambios

Destacados recientes:

- **v0.4.0**: Migración a [arquitectura CLI-first](https://github.com/HuangYuChuh/ComfyUI_Skill_CLI) — todas las operaciones de flujo de trabajo (`run`, `submit`, `status`, `import`, `deps`) ahora pasan por una herramienta CLI independiente; los scripts legacy de Python han sido eliminados.
- **v0.3.1**: Soporte de API Key de ComfyUI para nodos de API en la nube como Kling, Sora y Nano Banana.
- **v0.3.0**: Verificación e instalación de dependencias, `submit` y `status` no bloqueantes, carga de imágenes, previsualización de importación e historial de ejecución.

Consulta [CHANGELOG.md](./CHANGELOG.md) para el historial completo de versiones.

## Contribuir

¡Las contribuciones son bienvenidas! Por favor lee [CONTRIBUTING.md](./CONTRIBUTING.md) antes de enviar un PR.

## Recursos

- [English README](./README.md)
- [简体中文 README](./README.zh-CN.md)
- [繁體中文 README](./README.zh-TW.md)
- [日本語 README](./README.ja.md)
- [한국어 README](./README.ko.md)
- [Español README](./README.es.md)
- [ComfyUI Skill CLI](https://github.com/HuangYuChuh/ComfyUI_Skill_CLI)
- [Frontend Repository](https://github.com/HuangYuChuh/ComfyUI_Skills_OpenClaw-frontend)
- [Hermes Agent](https://github.com/NousResearch/hermes-agent) — plataforma de agentes AI compatible
- [agentskills.io](https://agentskills.io) — estándar abierto de formato de habilidades
