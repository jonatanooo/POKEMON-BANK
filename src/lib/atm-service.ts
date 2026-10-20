import { createClient } from "@supabase/supabase-js";

// =========================================================================
// 🏦 ATM SERVICE & DATABASE LAYER - POKÉMON BANK
// =========================================================================

export interface CuentaPokemon {
  id: string;
  idUsuario?: number | null;
  nombre: string;
  tipoCuenta: string;
  numeroCuenta: string;
  saldo: number;
  pinCajero: string;
  estado: "ACTIVA" | "BLOQUEADA" | "SUSPENDIDA";
  fotoPerfil: string;
  nivelEntrenador: string;
  limiteRetiroDiario: number;
}

export interface TransaccionATM {
  id: string;
  numeroCuenta: string;
  tipo: "DEPOSITO" | "RETIRO" | "PAGO_SERVICIO" | "CONSULTA";
  monto: number;
  saldoAnterior: number;
  saldoPosterior: number;
  descripcion: string;
  referencia: string;
  estado: "EXITOSA" | "RECHAZADA";
  fecha: string;
}

export interface ServicioATM {
  id: string;
  nombre: string;
  categoria: string;
  tarifaBase: number;
  icono: string;
}

// Cliente opcional de Supabase si existen las credenciales en .env
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://vknqulxhybbjaqhdttie.supabase.co";
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
export const supabase = supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

// =========================================================================
// 💾 MEMORIA PERSISTENTE DE LA CUENTA Y CAJERO AUTOMÁTICO
// =========================================================================
let cuentaEnMemoria: CuentaPokemon = {
  id: "PKMN-USR-60",
  idUsuario: 60,
  nombre: "JONATAN ALEXANDER ORELLANA HERNANDEZ",
  tipoCuenta: "CUENTA DE AHORRO",
  numeroCuenta: "34526685463256668",
  saldo: 1450250.0,
  pinCajero: "1234",
  estado: "ACTIVA",
  fotoPerfil: "/ICONOS%20POKEMON%20BANK/CHARIZARD.png",
  nivelEntrenador: "Nivel Maestro Pokémon ★★★",
  limiteRetiroDiario: 25000.0,
};

let transaccionesEnMemoria: TransaccionATM[] = [
  {
    id: "TX-PKMN-901",
    numeroCuenta: "34526685463256668",
    tipo: "DEPOSITO",
    monto: 50000,
    saldoAnterior: 1400250,
    saldoPosterior: 1450250,
    descripcion: "Recompensa Campeón Liga Pokémon",
    referencia: "REF-994821",
    estado: "EXITOSA",
    fecha: "Hoy, 10:30 AM",
  },
  {
    id: "TX-PKMN-902",
    numeroCuenta: "34526685463256668",
    tipo: "RETIRO",
    monto: 6000,
    saldoAnterior: 1456250,
    saldoPosterior: 1450250,
    descripcion: "Compra Poké Mart (Ultra Balls x50)",
    referencia: "REF-883719",
    estado: "EXITOSA",
    fecha: "Ayer, 04:15 PM",
  },
  {
    id: "TX-PKMN-903",
    numeroCuenta: "34526685463256668",
    tipo: "PAGO_SERVICIO",
    monto: 1500,
    saldoAnterior: 1451750,
    saldoPosterior: 1450250,
    descripcion: "Suscripción Silph Co. Cloud",
    referencia: "REF-772611",
    estado: "EXITOSA",
    fecha: "12 Oct 2026",
  },
  {
    id: "TX-PKMN-904",
    numeroCuenta: "34526685463256668",
    tipo: "DEPOSITO",
    monto: 12000,
    saldoAnterior: 1438250,
    saldoPosterior: 1450250,
    descripcion: "Premio Victoria Gimnasio Celeste",
    referencia: "REF-661502",
    estado: "EXITOSA",
    fecha: "10 Oct 2026",
  },
];

export const serviciosCatalogo: ServicioATM[] = [
  { id: "silph_co", nombre: "Silph Co. Electricidad", categoria: "Electricidad", tarifaBase: 850, icono: "⚡" },
  { id: "gym_celeste", nombre: "Gym Celeste (Agua)", categoria: "Agua", tarifaBase: 420, icono: "💧" },
  { id: "poke_net", nombre: "Poké-Net 5G Banda Ancha", categoria: "Telecomunicaciones", tarifaBase: 650, icono: "📶" },
  { id: "centro_pokemon", nombre: "Centro Pokémon Cuota Médica", categoria: "Salud", tarifaBase: 1200, icono: "🏥" },
];

// =========================================================================
// 🚀 OPERACIONES BANCARIAS DEL ATM
// =========================================================================

export async function getCuentaATM(numeroCuenta?: string): Promise<CuentaPokemon> {
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from("pokemon_bank_cuentas")
        .select("*")
        .eq("numero_cuenta", numeroCuenta || cuentaEnMemoria.numeroCuenta)
        .single();

      if (data && !error) {
        cuentaEnMemoria = {
          id: data.id,
          idUsuario: data.id_usuario,
          nombre: data.nombre_titular,
          tipoCuenta: data.tipo_cuenta,
          numeroCuenta: data.numero_cuenta,
          saldo: parseFloat(data.saldo),
          pinCajero: data.pin_cajero,
          estado: data.estado,
          fotoPerfil: data.foto_perfil,
          nivelEntrenador: data.nivel_entrenador,
          limiteRetiroDiario: parseFloat(data.limite_retiro_diario),
        };
      }
    } catch {
      // Usar memoria como respaldo
    }
  }
  return cuentaEnMemoria;
}

export async function ejecutarDepositoATM(monto: number): Promise<{ success: boolean; cuenta: CuentaPokemon; transaccion: TransaccionATM }> {
  if (monto <= 0) {
    throw new Error("El monto a depositar debe ser mayor a 0");
  }

  const saldoAnterior = cuentaEnMemoria.saldo;
  const saldoPosterior = saldoAnterior + monto;
  const ref = `DEP-${Math.floor(100000 + Math.random() * 900000)}`;

  cuentaEnMemoria.saldo = saldoPosterior;

  const nuevaTx: TransaccionATM = {
    id: `TX-${Date.now()}`,
    numeroCuenta: cuentaEnMemoria.numeroCuenta,
    tipo: "DEPOSITO",
    monto,
    saldoAnterior,
    saldoPosterior,
    descripcion: `Depósito en efectivo en Cajero ATM`,
    referencia: ref,
    estado: "EXITOSA",
    fecha: new Date().toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" }) + ", Hoy",
  };

  transaccionesEnMemoria = [nuevaTx, ...transaccionesEnMemoria];

  if (supabase) {
    try {
      await supabase
        .from("pokemon_bank_cuentas")
        .update({ saldo: saldoPosterior, updated_at: new Date().toISOString() })
        .eq("numero_cuenta", cuentaEnMemoria.numeroCuenta);

      await supabase.from("pokemon_bank_transacciones").insert({
        numero_cuenta: cuentaEnMemoria.numeroCuenta,
        tipo_transaccion: "DEPOSITO",
        monto,
        saldo_anterior: saldoAnterior,
        saldo_posterior: saldoPosterior,
        descripcion: nuevaTx.descripcion,
        referencia: nuevaTx.referencia,
      });
    } catch {
      // Ignorar si Supabase no tiene la tabla aún
    }
  }

  return { success: true, cuenta: cuentaEnMemoria, transaccion: nuevaTx };
}

export async function ejecutarRetiroATM(monto: number, pinIngresado?: string): Promise<{ success: boolean; cuenta: CuentaPokemon; transaccion: TransaccionATM }> {
  if (monto <= 0) {
    throw new Error("El monto a retirar debe ser mayor a 0");
  }

  if (pinIngresado && pinIngresado !== cuentaEnMemoria.pinCajero) {
    throw new Error("PIN de seguridad incorrecto");
  }

  if (monto > cuentaEnMemoria.saldo) {
    throw new Error("Fondos insuficientes en la cuenta");
  }

  if (monto > cuentaEnMemoria.limiteRetiroDiario) {
    throw new Error(`El monto excede el límite de retiro diario ($${cuentaEnMemoria.limiteRetiroDiario.toLocaleString()})`);
  }

  const saldoAnterior = cuentaEnMemoria.saldo;
  const saldoPosterior = saldoAnterior - monto;
  const ref = `RET-${Math.floor(100000 + Math.random() * 900000)}`;

  cuentaEnMemoria.saldo = saldoPosterior;

  const nuevaTx: TransaccionATM = {
    id: `TX-${Date.now()}`,
    numeroCuenta: cuentaEnMemoria.numeroCuenta,
    tipo: "RETIRO",
    monto,
    saldoAnterior,
    saldoPosterior,
    descripcion: `Retiro de efectivo en Cajero ATM`,
    referencia: ref,
    estado: "EXITOSA",
    fecha: new Date().toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" }) + ", Hoy",
  };

  transaccionesEnMemoria = [nuevaTx, ...transaccionesEnMemoria];

  if (supabase) {
    try {
      await supabase
        .from("pokemon_bank_cuentas")
        .update({ saldo: saldoPosterior, updated_at: new Date().toISOString() })
        .eq("numero_cuenta", cuentaEnMemoria.numeroCuenta);

      await supabase.from("pokemon_bank_transacciones").insert({
        numero_cuenta: cuentaEnMemoria.numeroCuenta,
        tipo_transaccion: "RETIRO",
        monto,
        saldo_anterior: saldoAnterior,
        saldo_posterior: saldoPosterior,
        descripcion: nuevaTx.descripcion,
        referencia: nuevaTx.referencia,
      });
    } catch {
      // Ignorar
    }
  }

  return { success: true, cuenta: cuentaEnMemoria, transaccion: nuevaTx };
}

export async function ejecutarPagoServicioATM(servicioId: string, monto?: number): Promise<{ success: boolean; cuenta: CuentaPokemon; transaccion: TransaccionATM; comprobante: string }> {
  const servicio = serviciosCatalogo.find((s) => s.id === servicioId);
  if (!servicio) {
    throw new Error("Servicio no encontrado");
  }

  const costo = monto || servicio.tarifaBase;

  if (costo > cuentaEnMemoria.saldo) {
    throw new Error("Fondos insuficientes para realizar el pago");
  }

  const saldoAnterior = cuentaEnMemoria.saldo;
  const saldoPosterior = saldoAnterior - costo;
  const autorizacion = `AUTH-PKMN-${Math.floor(100000 + Math.random() * 900000)}`;

  cuentaEnMemoria.saldo = saldoPosterior;

  const nuevaTx: TransaccionATM = {
    id: `TX-${Date.now()}`,
    numeroCuenta: cuentaEnMemoria.numeroCuenta,
    tipo: "PAGO_SERVICIO",
    monto: costo,
    saldoAnterior,
    saldoPosterior,
    descripcion: `Pago de servicio: ${servicio.nombre}`,
    referencia: autorizacion,
    estado: "EXITOSA",
    fecha: new Date().toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" }) + ", Hoy",
  };

  transaccionesEnMemoria = [nuevaTx, ...transaccionesEnMemoria];

  if (supabase) {
    try {
      await supabase
        .from("pokemon_bank_cuentas")
        .update({ saldo: saldoPosterior, updated_at: new Date().toISOString() })
        .eq("numero_cuenta", cuentaEnMemoria.numeroCuenta);

      await supabase.from("pokemon_bank_transacciones").insert({
        numero_cuenta: cuentaEnMemoria.numeroCuenta,
        tipo_transaccion: "PAGO_SERVICIO",
        monto: costo,
        saldo_anterior: saldoAnterior,
        saldo_posterior: saldoPosterior,
        descripcion: nuevaTx.descripcion,
        referencia: autorizacion,
      });
    } catch {
      // Ignorar
    }
  }

  return {
    success: true,
    cuenta: cuentaEnMemoria,
    transaccion: nuevaTx,
    comprobante: autorizacion,
  };
}

export async function getTransaccionesATM(): Promise<TransaccionATM[]> {
  return transaccionesEnMemoria;
}

export async function updateDatosCuenta(datos: Partial<CuentaPokemon>): Promise<CuentaPokemon> {
  cuentaEnMemoria = {
    ...cuentaEnMemoria,
    ...datos,
  };
  return cuentaEnMemoria;
}

