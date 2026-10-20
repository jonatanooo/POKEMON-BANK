import { NextResponse } from "next/server";
import { ejecutarDepositoATM } from "@/lib/atm-service";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const monto = parseFloat(body.monto);
    const pin = body.pin ? String(body.pin).trim() : undefined;

    if (isNaN(monto) || monto <= 0) {
      return NextResponse.json(
        { error: "El monto debe ser un número válido mayor a 0" },
        { status: 400 }
      );
    }

    const resultado = await ejecutarDepositoATM(monto, pin);
    return NextResponse.json(resultado);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error al procesar el depósito";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

