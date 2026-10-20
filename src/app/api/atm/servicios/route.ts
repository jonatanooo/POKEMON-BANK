import { NextResponse } from "next/server";
import { serviciosCatalogo } from "@/lib/atm-service";

export async function GET() {
  return NextResponse.json({ servicios: serviciosCatalogo });
}

