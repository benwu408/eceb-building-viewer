import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

let cached: object | null = null;

export async function GET() {
  if (cached) return NextResponse.json(cached);

  const filePath = path.join(process.cwd(), "public", "floors.json");
  const raw = fs.readFileSync(filePath, "utf-8");
  cached = JSON.parse(raw);

  return NextResponse.json(cached);
}
