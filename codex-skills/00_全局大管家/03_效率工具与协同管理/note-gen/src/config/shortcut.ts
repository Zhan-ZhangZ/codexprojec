export enum ShortcutSettings {
  screenshot = "shotcut-screenshot",
  text = "shotcut-text",
  pin = "window-pin",
  link = "shotcut-link"
}

export enum ShortcutDefault {
  screenshot = "Control+Shift+S",
  text = "Control+Shift+T",
  pin = "Control+Shift+P",
  link = "Control+Shift+L",
}

/**
 * 文件管理器快捷键
 * rename: F2 (Win/Linux) / Enter (macOS) - 重命名选中的文件或文件夹（仅桌面端）
 * copy: Ctrl+C (Win/Linux) / Cmd+C (macOS) - 复制选中的文件或文件夹
 * paste: Ctrl+V (Win/Linux) / Cmd+V (macOS) - 粘贴剪贴板中的文件或文件夹
 * cut: Ctrl+X (Win/Linux) / Cmd+X (macOS) - 剪切选中的文件或文件夹
 * delete: Delete (Win/Linux) / Backspace (macOS) - 删除选中的文件或文件夹
 */
export const FileShortcuts = {
  rename: 'F2',
  copy: 'Ctrl+C',
  paste: 'Ctrl+V',
  cut: 'Ctrl+X',
  delete: 'Delete'
} as const