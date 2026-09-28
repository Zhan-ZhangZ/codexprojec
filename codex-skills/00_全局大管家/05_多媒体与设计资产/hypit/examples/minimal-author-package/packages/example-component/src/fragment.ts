import { compositionTypes } from "@hypit/hypit/composition";
import { artifactTypes } from "@hypit/hypit/artifact";
import { sealGraphFragment } from "@hypit/hypit/author-kit";
import { timelineTypes } from "@hypit/hypit/timeline";
import { exampleProducers } from "./manifest.js";
import { exampleTypes } from "./manifest.js";

const input = (name: string) => ({ kind: "fragment-input" as const, name });
const operation = (id: string) => ({ kind: "fragment-operation" as const, operation: id });

export function createExampleFragment(producer: typeof exampleProducers[keyof typeof exampleProducers], id: string, media = false) {
  const inputs = [{ name: "timeline", type: timelineTypes.track }, ...(media ? [{ name: "media", type: artifactTypes.blob }] : [])];
  const renderInputs = { timeline: input("timeline"), ...(media ? { media: input("media") } : {}) };
  return sealGraphFragment({
    inputs,
    operations: [
      { id, producer, inputs: renderInputs, result: { kind: "output", name: "track" } },
    ],
    exports: [{ name: "track", type: compositionTypes.visualTrack, root: operation(id) }],
  });
}

export const exampleBoxFragment = createExampleFragment(exampleProducers.renderBox, "render-box");
export const exampleTextFragment = createExampleFragment(exampleProducers.renderText, "render-text");
export const exampleMediaFragment = createExampleFragment(exampleProducers.renderMedia, "render-media-slot", true);
export const exampleAppendFragment = sealGraphFragment({
  inputs: [{ name: "previous", type: exampleTypes.itemSet }, { name: "item", type: exampleTypes.itemSet }],
  operations: [{ id: "append-items", producer: exampleProducers.appendItems, inputs: { previous: input("previous"), item: input("item") }, result: { kind: "output", name: "set" } }],
  exports: [{ name: "set", type: exampleTypes.itemSet, root: operation("append-items") }],
});
