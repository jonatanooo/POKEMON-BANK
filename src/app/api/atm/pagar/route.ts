import { NextResponse } from "next/server";
import { ejecutarPagoServicioATM } from "@/lib/atm-service";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const servicioId = body.servicioId;
    const monto = body.monto ? parseFloat(body.monto) : undefined;

    if (!servicioId) {
      return NextResponse.json(
        { error: "Debe seleccionar un servicio para pagar" },
        { status: 400 }
      );
    }

    const resultado = await ejecutarPagoServicioATM(servicioId, monto);
    return NextResponse.json(resultado);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error al procesar el pago de servicio";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

