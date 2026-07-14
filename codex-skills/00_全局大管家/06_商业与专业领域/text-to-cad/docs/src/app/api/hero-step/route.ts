import { NextResponse } from "next/server";

export function GET(request: Request) {
  return NextResponse.redirect(
    new URL("/hero/planetary_gear_assembly.step.glb", request.url),
    307
  );
}
