import { NextResponse } from "next/server";
import { getServiciosATM } from "@/lib/atm-service";

export async function GET() {
  try {
    const servicios = await getServiciosATM();
    return NextResponse.json({ servicios });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error al obtener servicios";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
