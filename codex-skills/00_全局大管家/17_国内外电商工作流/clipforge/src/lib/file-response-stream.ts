import { createReadStream } from "fs";

/** A bounded disk stream whose cancellation also closes the file descriptor. */
export function fileResponseStream(path: string, range?: { start: number; end: number }): ReadableStream<Uint8Array> {
  const file = createReadStream(path, range);
  let closed = false;
  return new ReadableStream<Uint8Array>({
    start(controller) {
      file.on("data", (chunk) => {
        if (closed) return;
        controller.enqueue(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
        if ((controller.desiredSize ?? 0) <= 0) file.pause();
      });
      file.once("end", () => {
        if (closed) return;
        closed = true;
        controller.close();
      });
      file.once("error", (error) => {
        if (closed) return;
        closed = true;
        controller.error(error);
      });
    },
    pull() { if (!closed) file.resume(); },
    cancel() {
      closed = true;
      file.destroy();
    },
  }, { highWaterMark: 256 * 1024, size: (chunk) => chunk.byteLength });
}
