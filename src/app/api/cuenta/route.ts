import { NextResponse } from "next/server";
import { getCuentaATM, updateDatosCuenta } from "@/lib/atm-service";

export async function GET() {
  try {
    const cuenta = await getCuentaATM();
    return NextResponse.json(cuenta);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error al obtener la cuenta bancaria";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const cuentaActualizada = await updateDatosCuenta({
      nombre: typeof body.nombre === "string" ? body.nombre : undefined,
      tipoCuenta: typeof body.tipoCuenta === "string" ? body.tipoCuenta : undefined,
      saldo: body.saldo !== undefined && body.saldo !== "" ? parseFloat(body.saldo) : undefined,
      pin: body.pin ? String(body.pin).trim() : undefined,
    });
    return NextResponse.json({ success: true, cuenta: cuentaActualizada });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error al actualizar cuenta";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
