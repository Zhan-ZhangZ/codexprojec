import type { Logger } from '@guiiai/logg'

import { Jieba } from '@node-rs/jieba'
import { isBrowser } from '@tg-search/common'

let _jieba: Jieba | undefined

export async function ensureJieba(logger: Logger): Promise<Jieba | undefined> {
  logger = logger.withContext('jieba:loader')

  if (!_jieba) {
    try {
      if (isBrowser()) {
        _jieba = new Jieba()
      }
      else {
        const { loadDict } = await import('./jieba.dict')

        const dictBuffer = await loadDict(logger)
        _jieba = Jieba.withDict(dictBuffer)
      }

      logger.log('Jieba initialized successfully')
    }
    catch (error) {
      logger.withError(error).error('Failed to initialize jieba')

      // Return undefined on error, jieba is optional
      return undefined
    }
  }

  return _jieba
}
