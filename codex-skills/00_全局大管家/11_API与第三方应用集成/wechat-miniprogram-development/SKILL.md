---
name: wechat-miniprogram-development
description: 微信小程序 AI 协同开发全链路指南。完整记录了从环境依赖安装、大模型接入配置、具体避坑指南（如 lazyCodeLoading 与 Babel 报错解决）到 CLI 自动化预览和代码上传的实战开发工作流。Leading Words: 微信小程序开发, miniprogram, WXML/WXSS, 微信开发者工具CLI, 小程序提审, CloudBase MCP, hunyuan-v3, lazyCodeLoading
---

# 微信小程序实战开发全流程指南 (包含排坑记录)

你当前扮演的是专攻 **微信小程序 (WeChat Mini-program)** 的高级全栈开发 Agent。
这份指南浓缩了真实的开发与踩坑经验。当你接到“从零开发带 AI 功能的微信小程序”任务时，请严格按照以下从配置到上线的完整流程执行。

---

## 🚀 实战执行轨迹 (Execution Trajectory)

### 阶段 1：自动安装所需依赖与 MCP (Setup & Dependencies)
在你开始编写任何代码之前，你必须先武装自己的开发环境：
1. **挂载云开发 MCP 与技能**：
   - 自动执行命令，无交互式安装腾讯云开发扩展：
     ```bash
     npx skills add tencentcloudbase/cloudbase-skills -y
     ```
   - 确保你的 `.gemini/settings.json` (或对应的 mcp 配置文件) 中已拉取到 CloudBase MCP，这样你才能调用云数据库和原生 AI 能力。
2. **确认 AppID 与初始化**：
   - 索要小程序的 `AppID` 并写入 `project.config.json`。

### 阶段 2：全栈代码开发与【填坑指南】 (Development & Pitfalls)
在生成前端代码（WXML/WXSS/JS）和云端逻辑时，你**必须**遵守我们在实战中总结的血泪教训：

> [!CAUTION]
> **1. 致命报错：禁用 `for await` 语法**
> 在处理大模型流式输出（Stream）时，**绝对禁止**使用 ES2018 的 `for await (let event of res.eventStream)` 语法！微信开发者工具的 Babel 转译会直接引发白屏报错：`module '@babel/runtime/helpers/typeof.js' is not defined`。
> **正确解法**：必须使用回调函数形式，例如通过 `onText(text => {})` 和 `onFinish(() => {})` 来接收数据！

> [!WARNING]
> **2. 必须开启按需注入**
> 在全局配置文件 `app.json` 中，必须手动添加配置项：`"lazyCodeLoading": "requiredComponents"`，否则会被微信代码质量扫描系统持续警告。

> [!IMPORTANT]
> **3. 大模型调用规范**
> 当调用腾讯云 CloudBase 的 AI 模型时，切勿使用过时的 `"hunyuan-exp"`，必须将 provider 指定为 `"hunyuan-v3"`，将 model 指定为 `"hy3"`。

> **4. 严禁 DOM 操作**
> 小程序基于双线程架构，逻辑层在 JSCore 中运行，没有任何 Web 浏览器对象。禁止写任何类似 `document.getElementById` 的代码，只能用原生数据绑定 `this.setData()`。

### 阶段 3：工具链自动化预览 (CLI Preview)
当本地目录代码全部编写、调试完毕，你需要辅助用户在他们本地机器上看到效果：
1. **提示开启端口**：让用户在微信开发者工具中开启安全服务端口。
2. **终端打印二维码**：执行以下 CLI 指令，将小程序的二维码直接打印在终端面板供用户扫码：
   ```bash
   /Applications/wechatwebdevtools.app/Contents/MacOS/cli -p /项目的绝对路径/ --preview-qr-output terminal
   ```

### 阶段 4：代码上传与提审规则说明 (Upload & Publish)
在预览没问题后，你进行自动化上传：
1. **自动上传代码**：
   ```bash
   /Applications/wechatwebdevtools.app/Contents/MacOS/cli -u 1.0.0@/项目的绝对路径/ --upload-desc "AI 生成版本"
   ```
2. **输出“合规提审指导语”**：
   因为微信对 AI 内容监管严格，上传完成后，你必须向用户输出以下警示说明：
   > “代码已自动上传至微信公众平台！在您点击『提交审核』前，请注意：
   > 如果您的小程序对外提供 AI 问答功能，微信要求必须使用**企业主体**注册，且需申请『深度合成服务』类目（需算法备案），并在代码里强制接入微信内容安全检测接口 `msgSecCheck`。如果您是个人账号，大概率会被审核驳回，建议仅作为体验版供内部测试使用！”
