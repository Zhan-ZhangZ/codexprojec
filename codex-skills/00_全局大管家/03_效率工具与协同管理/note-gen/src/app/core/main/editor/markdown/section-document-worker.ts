import type {
  MarkdownSectionDocument,
  SplitMarkdownDocumentOptions,
} from './section-document'

interface SplitRequest {
  source: string
  options: SplitMarkdownDocumentOptions
}

type SplitResponse =
  | { ok: true; document: MarkdownSectionDocument }
  | { ok: false; error: string }

interface WorkerScope {
  onmessage: ((event: MessageEvent<SplitRequest>) => void) | null
  postMessage: (message: SplitResponse) => void
}

const workerScope = self as unknown as WorkerScope

workerScope.onmessage = async (event) => {
  try {
    const workerGlobal = globalThis as typeof globalThis & {
      isSpace?: (code: number) => boolean
    }
    if (!workerGlobal.isSpace) {
      workerGlobal.isSpace = code => (
        code === 0x20
        || code === 0x09
        || code === 0x0A
        || code === 0x0B
        || code === 0x0C
        || code === 0x0D
      )
    }
    const { splitMarkdownDocument } = await import('./section-document')
    const document = splitMarkdownDocument(event.data.source, event.data.options)
    // The caller already owns the source string. Avoid copying it back across
    // the worker boundary with the comparatively small section index.
    workerScope.postMessage({
      ok: true,
      document: { ...document, source: '' },
    })
  } catch (error) {
    workerScope.postMessage({
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    })
  }
}

export {}
