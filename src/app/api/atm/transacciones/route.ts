import { NextResponse } from "next/server";
import { getTransaccionesATM } from "@/lib/atm-service";

export async function GET() {
  try {
    const txs = await getTransaccionesATM(50);
    return NextResponse.json({ transacciones: txs });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error al obtener transacciones";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

