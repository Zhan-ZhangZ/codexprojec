import { ContextMenuItem, ContextMenuShortcut } from "@/components/ui/enhanced-context-menu";
import { DirTree } from "@/stores/article";
import { computedParentPath } from "@/lib/path";
import { Copy } from "lucide-react"
import { Kbd } from "@/components/ui/kbd"
import { BaseDirectory, mkdir, readDir, readTextFile, writeTextFile } from "@tauri-apps/plugin-fs";
import { toast } from "@/hooks/use-toast";

interface DuplicateFolderProps {
  item: DirTree;
  shortcut?: string;
}

export function DuplicateFolder({ item, shortcut }: DuplicateFolderProps) {
  const path = computedParentPath(item);

  async function handleDuplicateFolder() {
    try {
      const { generateCopyFoldername } = await import('@/lib/default-filename')
      const { getFilePathOptions, getWorkspacePath } = await import('@/lib/workspace')
      const workspace = await getWorkspacePath()

      // 获取父目录路径
      const parentPath = path.includes('/') ? path.split('/').slice(0, -1).join('/') : ''

      // 生成唯一的文件夹名称（带 _copy 后缀）
      const targetName = await generateCopyFoldername(parentPath, item.name)
      const targetPath = parentPath ? `${parentPath}/${targetName}` : targetName

      // 获取源路径和目标路径的选项
      const sourcePathOptions = await getFilePathOptions(path)
      const targetPathOptions = await getFilePathOptions(targetPath)

      // 创建目标文件夹
      if (workspace.isCustom) {
        await mkdir(targetPathOptions.path)
      } else {
        await mkdir(targetPathOptions.path, { baseDir: targetPathOptions.baseDir })
      }

      // 递归复制文件夹内容
      const copyDirRecursively = async (srcRelative: string, destRelative: string) => {
        const entries = await readDir(
          srcRelative,
          workspace.isCustom ? {} : { baseDir: BaseDirectory.AppData }
        )

        for (const entry of entries) {
          const srcEntryPath = `${srcRelative}/${entry.name}`
          const destEntryPath = `${destRelative}/${entry.name}`

          if (entry.isDirectory) {
            // 创建子目录
            if (workspace.isCustom) {
              await mkdir(destEntryPath)
            } else {
              await mkdir(destEntryPath, { baseDir: BaseDirectory.AppData })
            }
            await copyDirRecursively(srcEntryPath, destEntryPath)
          } else {
            // 复制文件
            try {
              let content = ''
              if (workspace.isCustom) {
                content = await readTextFile(srcEntryPath)
                await writeTextFile(destEntryPath, content)
              } else {
                content = await readTextFile(srcEntryPath, { baseDir: BaseDirectory.AppData })
                await writeTextFile(destEntryPath, content, { baseDir: BaseDirectory.AppData })
              }
            } catch (err) {
              console.error(`Error copying file ${srcEntryPath}:`, err)
            }
          }
        }
      }

      await copyDirRecursively(sourcePathOptions.path, targetPathOptions.path)

      // 刷新文件树
      const useArticleStore = (await import('@/stores/article')).default
      useArticleStore.getState().loadFileTree()

      toast({ title: `文件夹已复制为 ${targetName}` })
    } catch (error) {
      console.error('Duplicate folder failed:', error)
      toast({ title: '复制文件夹失败', variant: 'destructive' })
    }
  }

  return (
    <ContextMenuItem inset onClick={handleDuplicateFolder} menuType="file">
      <Copy className="mr-2 h-4 w-4" />
      创建副本
      {shortcut && (
        <ContextMenuShortcut menuType="file">
          <Kbd>{shortcut}</Kbd>
        </ContextMenuShortcut>
      )}
    </ContextMenuItem>
  );
}
