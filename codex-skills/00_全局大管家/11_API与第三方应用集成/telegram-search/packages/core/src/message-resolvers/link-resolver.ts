import type { Logger } from '@guiiai/logg'

import type { MessageResolver, MessageResolverOpts } from '.'
import type { CoreMessage } from '../types/message'

import { Ok } from '@unbird/result'

export function createLinkResolver(logger: Logger): MessageResolver {
  logger = logger.withContext('core:resolver:link')

  return {
    run: async (_opts: MessageResolverOpts) => {
      logger.verbose('Executing link resolver')

      return Ok([] as CoreMessage[])
    },
  }
}
