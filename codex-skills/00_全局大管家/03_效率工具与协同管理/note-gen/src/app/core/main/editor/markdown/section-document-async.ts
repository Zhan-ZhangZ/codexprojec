import {
  type MarkdownSectionDocument,
  type SplitMarkdownDocumentOptions,
} from './section-document'

type WorkerResponse =
  | { ok: true; document: MarkdownSectionDocument }
  | { ok: false; error: string }

function createAbortError(): Error {
  const error = new Error('Markdown section indexing was cancelled')
  error.name = 'AbortError'
  return error
}

function compactWorkerOptions(
  options: SplitMarkdownDocumentOptions,
): SplitMarkdownDocumentOptions {
  if (!options.previousDocument) return options

  return {
    ...options,
    previousDocument: {
      ...options.previousDocument,
      // ID reconciliation only needs previous section metadata. Avoid cloning
      // the complete old Markdown source into the worker a second time.
      source: '',
    },
  }
}

async function splitMarkdownDocumentOnMainThread(
  source: string,
  options: SplitMarkdownDocumentOptions,
  signal?: AbortSignal,
): Promise<MarkdownSectionDocument> {
  if (signal?.aborted) throw createAbortError()

  await new Promise<void>((resolve, reject) => {
    const handleAbort = () => {
      clearTimeout(timer)
      reject(createAbortError())
    }
    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', handleAbort)
      resolve()
    }, 0)
    signal?.addEventListener('abort', handleAbort, { once: true })
  })
  if (signal?.aborted) throw createAbortError()

  const markdownGlobal = globalThis as typeof globalThis & {
    isSpace?: (code: number) => boolean
  }
  if (!markdownGlobal.isSpace) {
    markdownGlobal.isSpace = code => (
      code === 0x20
      || code === 0x09
      || code === 0x0A
      || code === 0x0B
      || code === 0x0C
      || code === 0x0D
    )
  }
  const { splitMarkdownDocument } = await import('./section-document')
  if (signal?.aborted) throw createAbortError()
  return splitMarkdownDocument(source, options)
}

export async function splitMarkdownDocumentAsync(
  source: string,
  options: SplitMarkdownDocumentOptions = {},
  signal?: AbortSignal,
): Promise<MarkdownSectionDocument> {
  if (signal?.aborted) throw createAbortError()
  if (typeof Worker === 'undefined') {
    return splitMarkdownDocumentOnMainThread(source, options, signal)
  }

  try {
    return await new Promise<MarkdownSectionDocument>((resolve, reject) => {
      const worker = new Worker(
        new URL('./section-document-worker.ts', import.meta.url),
        { type: 'module' },
      )
      let settled = false

      const cleanup = () => {
        signal?.removeEventListener('abort', handleAbort)
        worker.terminate()
      }
      const resolveOnce = (document: MarkdownSectionDocument) => {
        if (settled) return
        settled = true
        cleanup()
        resolve(document)
      }
      const rejectOnce = (error: Error) => {
        if (settled) return
        settled = true
        cleanup()
        reject(error)
      }
      const handleAbort = () => rejectOnce(createAbortError())

      worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
        if (!event.data.ok) {
          rejectOnce(new Error(event.data.error))
          return
        }
        resolveOnce({ ...event.data.document, source })
      }
      worker.onerror = (event) => {
        rejectOnce(new Error(event.message || 'Markdown section worker failed'))
      }
      signal?.addEventListener('abort', handleAbort, { once: true })
      worker.postMessage({ source, options: compactWorkerOptions(options) })
    })
  } catch (error) {
    if (signal?.aborted || (error instanceof Error && error.name === 'AbortError')) {
      throw error
    }
    console.warn('Markdown section worker failed, falling back to the main thread:', error)
    return splitMarkdownDocumentOnMainThread(source, options, signal)
  }
}
