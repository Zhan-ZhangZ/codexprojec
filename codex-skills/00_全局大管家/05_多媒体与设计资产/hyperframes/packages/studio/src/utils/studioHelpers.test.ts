import { describe, expect, it } from "vitest";
import { resolveTimelineSelectionSeekTime } from "./studioHelpers";

describe("resolveTimelineSelectionSeekTime", () => {
  it("keeps the current time when it is already inside the clip range", () => {
    expect(resolveTimelineSelectionSeekTime(3, { start: 0, duration: 5 })).toBe(3);
  });

  it("clamps to the clip start when current time is before the clip", () => {
    expect(resolveTimelineSelectionSeekTime(1, { start: 4, duration: 3 })).toBe(4);
  });

  it("clamps to the clip end when current time is after the clip", () => {
    expect(resolveTimelineSelectionSeekTime(10, { start: 4, duration: 3 })).toBe(7);
  });

  it("falls back to the clip start for invalid current time", () => {
    expect(resolveTimelineSelectionSeekTime(Number.NaN, { start: 2, duration: 5 })).toBe(2);
  });
});
