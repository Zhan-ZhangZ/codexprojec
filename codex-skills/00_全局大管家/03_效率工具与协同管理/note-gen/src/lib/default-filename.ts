import { exists } from '@tauri-apps/plugin-fs'
import { getFilePathOptions, getWorkspacePath } from './workspace'

/**
 * 生成唯一的默认文件名
 * @param parentPath 父目录路径，空字符串表示根目录
 * @param baseName 基础文件名，默认为 "Untitled"
 * @returns 唯一的文件名（包含.md扩展名）
 */
export async function generateUniqueFilename(parentPath: string = '', baseName: string = 'Untitled'): Promise<string> {
  const workspace = await getWorkspacePath()

  // 构建基础文件名
  let filename = `${baseName}.md`
  let counter = 0

  while (true) {
    // 构建完整的相对路径
    const fullRelativePath = parentPath ? `${parentPath}/${filename}` : filename
    const pathOptions = await getFilePathOptions(fullRelativePath)

    // 检查文件是否存在
    let fileExists = false
    try {
      if (workspace.isCustom) {
        fileExists = await exists(pathOptions.path)
      } else {
        fileExists = await exists(pathOptions.path, { baseDir: pathOptions.baseDir })
      }
    } catch {
      // 如果检查失败，假设文件不存在
      fileExists = false
    }

    if (!fileExists) {
      return filename
    }

    // 文件存在，生成下一个候选名称
    counter++
    filename = `${baseName} (${counter}).md`
  }
}

/**
 * 生成复制文件的唯一名称
 * @param parentPath 父目录路径
 * @param originalName 原始文件名
 * @returns 唯一的文件名（保留原始扩展名）
 */
export async function generateCopyFilename(parentPath: string, originalName: string): Promise<string> {
  const workspace = await getWorkspacePath()

  // 分离文件名和扩展名
  const lastDotIndex = originalName.lastIndexOf('.')
  const baseName = lastDotIndex > 0 ? originalName.substring(0, lastDotIndex) : originalName
  const extension = lastDotIndex > 0 ? originalName.substring(lastDotIndex) : ''

  // 首先尝试原始名称
  let filename = originalName
  let counter = 0

  while (true) {
    // 构建完整的相对路径
    const fullRelativePath = parentPath ? `${parentPath}/${filename}` : filename
    const pathOptions = await getFilePathOptions(fullRelativePath)

    // 检查文件是否存在
    let fileExists = false
    try {
      if (workspace.isCustom) {
        fileExists = await exists(pathOptions.path)
      } else {
        fileExists = await exists(pathOptions.path, { baseDir: pathOptions.baseDir })
      }
    } catch {
      // 如果检查失败，假设文件不存在
      fileExists = false
    }

    if (!fileExists) {
      return filename
    }

    // 文件存在，生成下一个候选名称
    counter++
    if (counter === 1) {
      // 第一次重复，使用 "_copy" 后缀
      filename = `${baseName}_copy${extension}`
    } else {
      // 后续重复，使用数字后缀
      filename = `${baseName}_copy_${counter}${extension}`
    }
  }
}

/**
 * 生成复制文件夹的唯一名称
 * @param parentPath 父目录路径
 * @param originalName 原始文件夹名
 * @returns 唯一的文件夹名
 */
export async function generateCopyFoldername(parentPath: string, originalName: string): Promise<string> {
  const workspace = await getWorkspacePath()

  // 首先尝试原始名称
  let foldername = originalName
  let counter = 0

  while (true) {
    // 构建完整的相对路径
    const fullRelativePath = parentPath ? `${parentPath}/${foldername}` : foldername
    const pathOptions = await getFilePathOptions(fullRelativePath)

    // 检查文件夹是否存在
    let folderExists = false
    try {
      if (workspace.isCustom) {
        folderExists = await exists(pathOptions.path)
      } else {
        folderExists = await exists(pathOptions.path, { baseDir: pathOptions.baseDir })
      }
    } catch {
      // 如果检查失败，假设文件夹不存在
      folderExists = false
    }

    if (!folderExists) {
      return foldername
    }

    // 文件夹存在，生成下一个候选名称
    counter++
    if (counter === 1) {
      // 第一次重复，使用 "_copy" 后缀
      foldername = `${originalName}_copy`
    } else {
      // 后续重复，使用数字后缀
      foldername = `${originalName}_copy_${counter}`
    }
  }
}


