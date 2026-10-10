import { ContextMenuItem, ContextMenuShortcut } from "@/components/ui/enhanced-context-menu";
import { Kbd } from "@/components/ui/kbd";
import { useTranslations } from "next-intl";
import { FolderInput } from "lucide-react";
import { platform } from "@tauri-apps/plugin-os";
import { useEffect, useState } from "react";

interface RenameFolderProps {
  item: { name: string };
  onStartRename: () => void;
  shortcut?: string;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function RenameFolder({ item, onStartRename, shortcut }: RenameFolderProps) {
  const t = useTranslations('article.file');
  const [renameKey, setRenameKey] = useState('F2');

  useEffect(() => {
    // 如果从外部传入了快捷键，使用外部传入的
    if (shortcut) {
      setRenameKey(shortcut);
      return;
    }
    try {
      const p = platform();
      setRenameKey(p === 'macos' ? 'Enter' : 'F2');
    } catch {
      setRenameKey('F2');
    }
  }, [shortcut]);

  function handleStartRename() {
    // 不再更新文件树，只调用父组件的重命名处理函数
    // 父组件会通过本地状态管理编辑状态
    onStartRename();
  }

  return (
    <ContextMenuItem inset onClick={handleStartRename} menuType="file">
      <FolderInput className="mr-2 h-4 w-4" />
      {t('context.rename')}
      <ContextMenuShortcut menuType="file">
        <Kbd>{renameKey}</Kbd>
      </ContextMenuShortcut>
    </ContextMenuItem>
  );
}
