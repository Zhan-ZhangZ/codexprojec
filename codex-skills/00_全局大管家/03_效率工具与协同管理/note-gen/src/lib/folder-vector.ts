import { exists, readTextFile } from "@tauri-apps/plugin-fs";
import { collectMarkdownFiles } from "@/lib/files";
import { getFilePathOptions } from "@/lib/workspace";
import { checkEmbeddingModelAvailable, processMarkdownFile } from "@/lib/rag";

export type FolderVectorMode = 'missing' | 'recalculate';

interface CalculateFolderVectorsOptions {
  folderPath: string;
  mode: FolderVectorMode;
  checkFileVectorIndexed?: (filePath: string) => Promise<boolean>;
  setVectorCalcStatus?: (path: string, status: 'idle' | 'calculating' | 'completed') => void;
  onProgress?: (progress: {
    total: number;
    processed: number;
    failed: number;
    currentFile: string;
  }) => void;
}

interface CalculateFolderVectorsResult {
  total: number;
  success: number;
  failed: number;
  skipped: number;
  embeddingModelAvailable: boolean;
}

export async function calculateFolderVectors({
  folderPath,
  mode,
  checkFileVectorIndexed,
  setVectorCalcStatus,
  onProgress,
}: CalculateFolderVectorsOptions): Promise<CalculateFolderVectorsResult> {
  const markdownFiles = await collectMarkdownFiles(folderPath);

  if (markdownFiles.length === 0) {
    return {
      total: 0,
      success: 0,
      failed: 0,
      skipped: 0,
      embeddingModelAvailable: true,
    };
  }

  const embeddingModelAvailable = await checkEmbeddingModelAvailable();
  if (!embeddingModelAvailable) {
    return {
      total: markdownFiles.length,
      success: 0,
      failed: 0,
      skipped: 0,
      embeddingModelAvailable: false,
    };
  }

  let success = 0;
  let failed = 0;
  let skipped = 0;
  let processed = 0;

  for (const file of markdownFiles) {
    try {
      const hasVector = checkFileVectorIndexed
        ? await checkFileVectorIndexed(file.path)
        : false;

      if (mode === 'missing' && hasVector) {
        skipped++;
        continue;
      }

      setVectorCalcStatus?.(file.path, 'calculating');

      const pathOptions = await getFilePathOptions(file.path);
      const fileExists = pathOptions.baseDir
        ? await exists(pathOptions.path, { baseDir: pathOptions.baseDir })
        : await exists(pathOptions.path);

      if (!fileExists) {
        setVectorCalcStatus?.(file.path, 'idle');
        failed++;
        continue;
      }

      const content = pathOptions.baseDir
        ? await readTextFile(pathOptions.path, { baseDir: pathOptions.baseDir })
        : await readTextFile(pathOptions.path);

      const successResult = await processMarkdownFile(file.path, content);
      if (!successResult) {
        setVectorCalcStatus?.(file.path, 'idle');
        failed++;
      } else {
        setVectorCalcStatus?.(file.path, 'completed');
        success++;
      }
    } catch (error) {
      console.error(`计算文件 ${file.name} 向量失败:`, error);
      setVectorCalcStatus?.(file.path, 'idle');
      failed++;
    } finally {
      processed++;
      onProgress?.({
        total: markdownFiles.length,
        processed,
        failed,
        currentFile: file.name,
      });
    }
  }

  return {
    total: markdownFiles.length,
    success,
    failed,
    skipped,
    embeddingModelAvailable: true,
  };
}
