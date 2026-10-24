import { NextResponse } from "next/server";
import type { ApiError } from "@/lib/dto";

/** Every failing API response has the same body: { error }. */
export function jsonError(status: number, error: string) {
  return NextResponse.json<ApiError>({ error }, { status });
}
