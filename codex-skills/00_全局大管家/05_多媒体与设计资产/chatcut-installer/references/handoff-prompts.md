# 交接提示词（第 5 步全文）

按验证结果二选一。语言跟随用户实际会话语言（不是系统语言），不询问用户；其他语言自行从英文翻译。

## editing 模式（全部验证通过）

> 当前安装会话调不到新装的 MCP 工具，登录成功也不行——必须新会话。

**中文：**

```text
ChatCut 插件已经安装好了，请你用内置浏览器打开一个 ChatCut 项目，把项目名称命名为“我的第一个ChatCut视频”，然后先告诉我你整体可以做什么，尤其是这三部分：视频剪辑（语音清理、字幕、转场、补充素材等）、MG 动画制作、素材生成（视频、旁白、音乐、音效等）。之后问我有什么素材、想做什么样的视频，告诉我你可以根据我的具体需求一步步开始制作，并且我也可以随时进入 ChatCut 编辑界面自己调整时间线、字幕、MG 动画等任何内容，就像使用传统编辑器一样。
```

**English：**

```text
The ChatCut plugin is already installed. Please use the built-in browser to open a ChatCut project, name the project "My First ChatCut Video", then first tell me an overall view of what you can do, especially these three parts —— video editing(speech cleanup, caption, transition, b-roll, etc), motion graphics creation, assets generation(video, voiceover, music, sound effects, etc). After that, ask me what materials I have and what kind of video I want to make. Tell me you can start making it step by step based on my specific needs and I can also hop into the ChatCut editing interface anytime and adjust things by myself, timeline, captions, motion graphics, anything, just like a traditional editor.
```

## recovery 模式（任一步失败或未确认）

把 `<FAILED_OR_INCOMPLETE_STEP_AND_ERROR>` 替换为本会话中**具体**失败/未完成步骤与最有用的错误或验证结果，禁止泛化。恢复会话必须先重试安装，成功后**再另开**剪辑会话（恢复会话里装的工具不会加载进同一会话）。

**中文：**

```text
ChatCut 插件还没有完成安装或授权。请阅读 https://chatcut.io/chatgpt ，并从下面这个失败或未完成的步骤继续重试：
<FAILED_OR_INCOMPLETE_STEP_AND_ERROR>
不要假设插件已经安装或授权成功；请重新检查并完成插件安装、登录授权和全部验证。全部成功后，再为我创建并打开一个新的 ChatCut 编辑任务。
```

**English：**

```text
The ChatCut plugin installation or authorization is not complete. Read https://chatcut.io/chatgpt and continue retrying from the failed or incomplete step below:
<FAILED_OR_INCOMPLETE_STEP_AND_ERROR>
Do not assume the plugin is installed or authorized; recheck and complete plugin installation, login authorization, and all verification. After everything succeeds, create and open a separate new ChatCut editing task for me.
```
