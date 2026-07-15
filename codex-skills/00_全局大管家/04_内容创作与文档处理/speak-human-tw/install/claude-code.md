# Claude Code 安裝指南

Claude Code 會自動讀 `~/.claude/skills/` 下每個 skill 的 frontmatter description，對話內容命中就自動觸發，不需要額外設定。

## 方法一：clone 進 skills 目錄（最簡單）

```bash
git clone https://github.com/Raymondhou0917/speak-human-tw.git ~/.claude/skills/speak-human-tw
```

## 方法二：symlink 跟隨更新（推薦長期使用）

clone 到你慣用的專案目錄，再軟連結進 skills 目錄。之後 `git pull` 就能更新，不用重複安裝：

```bash
git clone https://github.com/Raymondhou0917/speak-human-tw.git ~/projects/speak-human-tw
ln -s ~/projects/speak-human-tw ~/.claude/skills/speak-human-tw
```

## 方法三：讓 agent 自己裝

把這句丟給 Claude Code：

```
幫我安裝這個 skill：https://github.com/Raymondhou0917/speak-human-tw
clone 到 ~/.claude/skills/speak-human-tw
```

## 驗證安裝

重啟 Claude Code（或開新對話），輸入：

```
/speak-human-tw
```

或直接貼一段文字說「幫這段去 AI 味」。看到它開始按「判情境 → 鎖保護清單」流程走，就是裝好了。

## 使用方式

**日常觸發**（自動命中，不用打指令）：

- 「這段好 AI，幫我說人話」
- 「幫我校對這篇電子報，去掉 AI 味再發」
- 「這則貼文改自然一點」

**Annotation mode**（只標問題不改稿）：

- 「先標問題不要改，這段哪裡像 AI？」

**校對檔案**：

- 「幫我校對 newsletter-draft.md，走一遍去 AI 味流程」

## lite / full 兩種安裝範圍

- **full（預設，建議）**：整個 repo 都在 skills 目錄裡，Claude 會按需要補讀 `references/` 的完整規則（38 種痕跡、台灣用語表、誤殺防護）
- **lite**：只複製 `SKILL.md` 一個檔案也能運作，靠檔內的「單檔兜底規則」做基礎清理，但沒有完整的模式庫和誤殺防護

## 常駐專案的觸發加強（選用）

如果你在特定專案想強制每次輸出都過這關，在專案的 `CLAUDE.md` 加一段：

```markdown
## 寫作風格
所有對外文字（貼文、電子報、文案、回信）輸出前，遵循 speak-human-tw skill 的規則做去 AI 味檢查。
程式碼、log、設定檔不套用。
```
