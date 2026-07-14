"use client";

import type { CSSProperties } from "react";
import { useLayoutEffect, useRef, useState } from "react";
import { HeroStepRender } from "@/components/hero-step-render";

const cadSkillsAscii = String.raw` ██████╗ █████╗ ██████╗   ███████╗██╗  ██╗██╗██╗     ██╗     ███████╗
██╔════╝██╔══██╗██╔══██╗  ██╔════╝██║ ██╔╝██║██║     ██║     ██╔════╝
██║     ███████║██║  ██║  ███████╗█████╔╝ ██║██║     ██║     ███████╗
██║     ██╔══██║██║  ██║  ╚════██║██╔═██╗ ██║██║     ██║     ╚════██║
╚██████╗██║  ██║██████╔╝  ███████║██║  ██╗██║███████╗███████╗███████║
 ╚═════╝╚═╝  ╚═╝╚═════╝   ╚══════╝╚═╝  ╚═╝╚═╝╚══════╝╚══════╝╚══════╝`;

const ASCII_MEASURE_FONT_SIZE = 10;
const ASCII_MIN_FONT_SIZE = 7;
const ASCII_MAX_FONT_SIZE = 18;
const ASCII_MAX_HEIGHT = 132;
const ASCII_WIDTH_FILL = 0.995;

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function AsciiWord({ ascii }: { ascii: string }) {
  const frameRef = useRef<HTMLDivElement>(null);
  const measureRef = useRef<HTMLPreElement>(null);
  const [fontSize, setFontSize] = useState(10.5);

  useLayoutEffect(() => {
    const frame = frameRef.current;
    const measure = measureRef.current;

    if (!frame || !measure) {
      return;
    }

    const updateFontSize = () => {
      const measuredWidth = measure.scrollWidth;
      const measuredHeight = measure.scrollHeight;
      const availableWidth = frame.clientWidth * ASCII_WIDTH_FILL;

      if (!measuredWidth || !measuredHeight || !availableWidth) {
        return;
      }

      const widthSize =
        (availableWidth / measuredWidth) * ASCII_MEASURE_FONT_SIZE;
      const heightSize =
        (ASCII_MAX_HEIGHT / measuredHeight) * ASCII_MEASURE_FONT_SIZE;
      const nextFontSize = clamp(
        Math.min(widthSize, heightSize),
        ASCII_MIN_FONT_SIZE,
        ASCII_MAX_FONT_SIZE
      );

      setFontSize((current) =>
        Math.abs(current - nextFontSize) > 0.05 ? nextFontSize : current
      );
    };

    updateFontSize();

    const resizeObserver = new ResizeObserver(updateFontSize);
    resizeObserver.observe(frame);

    void document.fonts?.ready.then(updateFontSize);

    return () => resizeObserver.disconnect();
  }, [ascii]);

  const visibleClassName =
    "inline-block select-none whitespace-pre font-mono leading-[108%]";
  const measureClassName =
    "pointer-events-none invisible absolute left-0 top-0 inline-block whitespace-pre font-mono text-[10px] leading-[108%]";
  const asciiStyle = { fontSize: `${fontSize}px` } as CSSProperties;

  return (
    <div
      ref={frameRef}
      className="relative max-h-[132px] w-full overflow-hidden"
    >
      <pre ref={measureRef} className={measureClassName} aria-hidden="true">
        {ascii}
      </pre>
      <pre
        className={`${visibleClassName} text-muted-foreground/55`}
        style={asciiStyle}
      >
        {ascii}
      </pre>
      <pre
        className={`ascii-terminal-reveal absolute left-0 top-0 ${visibleClassName} text-foreground`}
        style={asciiStyle}
      >
        {ascii}
      </pre>
    </div>
  );
}

function HeroAsciiHeading() {
  return (
    <div aria-hidden="true" className="w-full max-w-full overflow-hidden">
      <AsciiWord ascii={cadSkillsAscii} />
    </div>
  );
}

function HeroSubtitle({ className = "" }: { className?: string }) {
  return (
    <p
      className={`text-[17px] font-medium leading-7 text-foreground sm:text-[20px] sm:leading-8 lg:text-[22px] lg:leading-9 ${className}`}
    >
      Generate CAD in AI agents like Codex and Claude Code.{" "}
      <span className="text-primary">
        100% open source, runs locally, free forever.
      </span>
    </p>
  );
}

export function HeroSection() {
  return (
    <section className="border border-border bg-card">
      <div className="grid min-w-0 lg:grid-cols-2">
        <div className="flex min-w-0 items-center px-4 py-4 sm:px-5 lg:min-h-[156px] lg:px-6 lg:py-5">
          <h1 className="sr-only">CAD Skills</h1>
          <HeroAsciiHeading />
        </div>

        <div className="flex min-w-0 items-center border-t border-border px-4 py-4 sm:px-5 lg:min-h-[156px] lg:border-l lg:border-t-0 lg:px-6 lg:py-5">
          <HeroSubtitle className="w-full lg:max-w-[34rem]" />
        </div>
      </div>

      <div className="h-[260px] min-h-0 border-t border-border bg-background sm:h-[300px] lg:h-[340px]">
        <HeroStepRender />
      </div>
    </section>
  );
}
