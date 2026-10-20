import { NextResponse } from "next/server";
import { getCuentaATM, updateDatosCuenta } from "@/lib/atm-service";

export async function GET() {
  try {
    const cuenta = await getCuentaATM();
    return NextResponse.json(cuenta);
  } catch (error) {
    return NextResponse.json(
      { error: "Error al obtener la cuenta bancaria" },
      { status: 500 }
    );
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const cuentaActualizada = await updateDatosCuenta(body);
    return NextResponse.json({ success: true, cuenta: cuentaActualizada });
  } catch (error: unknown) {
    const err = error as Error;
    return NextResponse.json(
      { error: err.message || "Error al actualizar cuenta" },
      { status: 400 }
    );
  }
}
