import { NextResponse } from "next/server";
import { ejecutarPagoServicioATM } from "@/lib/atm-service";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const servicioId = body.servicioId;
    const monto = parseFloat(body.monto);

    if (!servicioId) {
      return NextResponse.json(
        { error: "Debe seleccionar un servicio para pagar" },
        { status: 400 }
      );
    }

    if (isNaN(monto) || monto <= 0) {
      return NextResponse.json(
        { error: "El monto a pagar debe ser un número válido mayor a 0" },
        { status: 400 }
      );
    }

    const resultado = await ejecutarPagoServicioATM(String(servicioId), monto);
    return NextResponse.json(resultado);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error al procesar el pago de servicio";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

