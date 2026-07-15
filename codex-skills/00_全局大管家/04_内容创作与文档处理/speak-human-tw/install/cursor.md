# Cursor 安裝指南

Cursor 支援 Agent Skills：把 skill 放進使用者層級或專案層級的 skills 目錄，Agent 會依 `SKILL.md` frontmatter 的 description 自動觸發。

## 方法一：使用者層級（所有專案可用，推薦）

```bash
git clone https://github.com/Raymondhou0917/speak-human-tw.git ~/.cursor/skills/speak-human-tw
```

## 方法二：專案層級（跟著 repo 走，適合團隊共用）

```bash
cd your-project
git clone https://github.com/Raymondhou0917/speak-human-tw.git .cursor/skills/speak-human-tw
```

團隊成員 pull 下來就都能用。不想把整包進版控，可以在 `.gitignore` 排除後改用 submodule：

```bash
git submodule add https://github.com/Raymondhou0917/speak-human-tw.git .cursor/skills/speak-human-tw
```

## 驗證安裝

開新的 Agent 對話，貼一段文字說：

```
這段好 AI，幫我說人話
```

Agent 讀取 skill 後會按「判情境 → 鎖保護清單 → 改寫 → 回讀」流程走，就是裝好了。

## 使用方式

- **改寫**：「幫這篇電子報去 AI 味」「這則貼文改自然一點再給我」
- **只標問題**：「先標問題不要改，這段哪裡像 AI？」
- **改檔案**：在編輯器開著草稿檔，直接說「幫我校對這個檔案，去 AI 味」
- **搭配 Cursor Rules**（選用）：想在某個內容專案強制所有輸出過這關，在專案的 rules 裡加一條「所有對外文字輸出前遵循 speak-human-tw skill 檢查」

## 更新

```bash
cd ~/.cursor/skills/speak-human-tw && git pull
```

## Windsurf 與其他支援 Markdown skill 的工具

原理相同：把整個資料夾放進該工具的 skills 目錄（或任何 Agent 讀得到的路徑），確保 `SKILL.md` 在資料夾根目錄，再用觸發語驗證。最低需求只有 `SKILL.md` 一個檔案（lite 模式），完整功能需要 `references/` 一起。
