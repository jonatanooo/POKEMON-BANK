import { createClient } from "@supabase/supabase-js";

// Unión de la db con el cajero

export interface CuentaPokemon {
  numeroCuenta: string;
  nombre: string;
  tipoCuenta: string;
  saldo: number;
  estado: string;
  fotoPerfil: string;
  nivelEntrenador: string;
  limiteRetiroDiario: number;
}

export type TipoTransaccion = "DEPOSITO" | "RETIRO" | "PAGO_SERVICIO";

export interface TransaccionATM {
  id: string;
  tipo: TipoTransaccion;
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
  institucion: string;
  npe: string;
  icono: string;
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
export const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

// Cuenta del cajero
const ID_CUENTA_ATM = process.env.ATM_ID_CUENTA || "34526685463256668";

// Datos que no están en la db
const FOTO_PERFIL = "/ICONOS%20POKEMON%20BANK/CHARIZARD.png";
const NIVEL_ENTRENADOR = "Nivel Maestro Pokémon ★★★";
const LIMITE_RETIRO = 25000;

// Tipos de transacción en la db
const TIPO_BD: Record<TipoTransaccion, string> = {
  DEPOSITO: "Depósito",
  RETIRO: "Retiro",
  PAGO_SERVICIO: "Pago de Servicios",
};

function db() {
  if (!supabase) {
    throw new Error("Supabase no está configurado. Revise NEXT_PUBLIC_SUPABASE_URL y la llave en .env.local");
  }
  return supabase;
}

function tipoDesdeBD(tipo: string): TipoTransaccion {
  if (tipo === TIPO_BD.DEPOSITO) return "DEPOSITO";
  if (tipo === TIPO_BD.RETIRO) return "RETIRO";
  return "PAGO_SERVICIO";
}

// La db guarda la hora en UTC
function formatearFecha(fechaHora: string): string {
  const fecha = new Date(fechaHora.endsWith("Z") ? fechaHora : `${fechaHora}Z`);
  const partes = new Intl.DateTimeFormat("es-SV", {
    timeZone: "America/El_Salvador",
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "numeric",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(fecha);
  const p = (tipo: string) => partes.find((x) => x.type === tipo)?.value ?? "";
  return `${p("day")}/${p("month")}/${p("year")} | ${p("hour")}:${p("minute")}`;
}

function iconoServicio(nombre: string): string {
  const n = nombre.toLowerCase();
  if (n.includes("eléctric") || n.includes("energ") || n.includes("luz")) return "⚡";
  if (n.includes("agua")) return "💧";
  if (n.includes("internet")) return "📶";
  if (n.includes("telef")) return "📞";
  return "🧾";
}

// Operaciones del cajero

export async function getCuentaATM(): Promise<CuentaPokemon> {
  const { data, error } = await db()
    .from("cuentas")
    .select("id_cuenta, nombre_titular, tipo_cuenta, saldo_disponible, estado_cuenta")
    .eq("id_cuenta", ID_CUENTA_ATM)
    .single();

  if (error || !data) {
    throw new Error("No se encontró la cuenta del cajero en la base de datos");
  }

  return {
    numeroCuenta: data.id_cuenta,
    nombre: data.nombre_titular,
    tipoCuenta: data.tipo_cuenta,
    saldo: Number(data.saldo_disponible),
    estado: data.estado_cuenta,
    fotoPerfil: FOTO_PERFIL,
    nivelEntrenador: NIVEL_ENTRENADOR,
    limiteRetiroDiario: LIMITE_RETIRO,
  };
}

async function getCuentaActiva(): Promise<CuentaPokemon> {
  const cuenta = await getCuentaATM();
  if (cuenta.estado.toLowerCase() !== "activa") {
    throw new Error(`La cuenta no está activa (${cuenta.estado})`);
  }
  return cuenta;
}

export async function getTransaccionesATM(limite = 20): Promise<TransaccionATM[]> {
  const [cuenta, { data, error }] = await Promise.all([
    getCuentaATM(),
    db()
      .from("transacciones")
      .select("id_transaccion, tipo_transaccion, descripcion, monto, fecha_hora")
      .eq("id_cuenta", ID_CUENTA_ATM)
      .order("fecha_hora", { ascending: false })
      .order("id_transaccion", { ascending: false })
      .limit(limite),
  ]);

  if (error) {
    throw new Error("No se pudieron cargar las transacciones");
  }

  // Saldo de cada movimiento
  let saldo = cuenta.saldo;
  return (data ?? []).map((tx) => {
    const monto = Number(tx.monto);
    const saldoPosterior = saldo;
    const saldoAnterior = Math.round((saldoPosterior - monto) * 100) / 100;
    saldo = saldoAnterior;

    return {
      id: String(tx.id_transaccion),
      tipo: tipoDesdeBD(tx.tipo_transaccion),
      monto: Math.abs(monto),
      saldoAnterior,
      saldoPosterior,
      descripcion: tx.descripcion,
      referencia: `TX-${String(tx.id_transaccion).padStart(6, "0")}`,
      estado: "EXITOSA",
      fecha: formatearFecha(tx.fecha_hora),
    };
  });
}

export async function getServiciosATM(): Promise<ServicioATM[]> {
  const { data, error } = await db()
    .from("servicios")
    .select("id_servicio, nombre_servicio, institucion, npe")
    .order("id_servicio");

  if (error) {
    throw new Error("No se pudo cargar el catálogo de servicios");
  }

  return (data ?? []).map((s) => ({
    id: String(s.id_servicio),
    nombre: s.nombre_servicio,
    institucion: s.institucion,
    npe: s.npe,
    icono: iconoServicio(s.nombre_servicio),
  }));
}

// Guarda la transacción y actualiza el saldo
async function procesarTransaccion(
  tipo: TipoTransaccion,
  descripcion: string,
  montoConSigno: number
): Promise<{ success: boolean; cuenta: CuentaPokemon; transaccion: TransaccionATM }> {
  const { error } = await db().rpc("sp_procesartransaccion", {
    p_id_cuenta: ID_CUENTA_ATM,
    p_tipo_transaccion: TIPO_BD[tipo],
    p_descripcion: descripcion,
    p_monto: montoConSigno,
  });

  if (error) {
    throw new Error("La base de datos rechazó la transacción");
  }

  const [transaccion] = await getTransaccionesATM(1);
  const cuenta = await getCuentaATM();
  return { success: true, cuenta, transaccion };
}

// Valida el PIN y lo registra en auditoría
async function validarPin(pinIngresado?: string) {
  if (!pinIngresado || !/^\d{4}$/.test(pinIngresado)) {
    throw new Error("Ingrese un PIN de 4 dígitos");
  }

  const { data, error } = await db().rpc("sp_validarpin", {
    p_id_cuenta: ID_CUENTA_ATM,
    p_pin: pinIngresado,
  });

  if (error) {
    throw new Error("No se pudo validar el PIN");
  }

  const validacion = Array.isArray(data) ? data[0] : data;
  if (!validacion || validacion.estado !== "Exito") {
    throw new Error(validacion?.mensaje || "PIN de seguridad incorrecto");
  }
}

export async function ejecutarDepositoATM(monto: number, pinIngresado?: string) {
  if (monto <= 0) {
    throw new Error("El monto a depositar debe ser mayor a 0");
  }

  await getCuentaActiva();
  await validarPin(pinIngresado);
  return procesarTransaccion("DEPOSITO", "Depósito en efectivo en Cajero ATM", monto);
}

export async function ejecutarRetiroATM(monto: number, pinIngresado?: string) {
  if (monto <= 0) {
    throw new Error("El monto a retirar debe ser mayor a 0");
  }

  const cuenta = await getCuentaActiva();
  await validarPin(pinIngresado);

  if (monto > cuenta.saldo) {
    throw new Error("Fondos insuficientes en la cuenta");
  }
  if (monto > cuenta.limiteRetiroDiario) {
    throw new Error(`El monto excede el límite de retiro diario ($${cuenta.limiteRetiroDiario.toLocaleString()})`);
  }

  return procesarTransaccion("RETIRO", "Retiro de efectivo en Cajero ATM", -monto);
}

export async function ejecutarPagoServicioATM(servicioId: string, monto: number) {
  if (!(monto > 0)) {
    throw new Error("Ingrese el monto a pagar");
  }

  const { data: servicio, error } = await db()
    .from("servicios")
    .select("nombre_servicio, institucion, npe")
    .eq("id_servicio", Number(servicioId))
    .single();

  if (error || !servicio) {
    throw new Error("Servicio no encontrado");
  }

  const cuenta = await getCuentaActiva();
  if (monto > cuenta.saldo) {
    throw new Error("Fondos insuficientes para realizar el pago");
  }

  const descripcion = `Pago ${servicio.nombre_servicio} - ${servicio.institucion} (NPE ${servicio.npe})`;
  const resultado = await procesarTransaccion("PAGO_SERVICIO", descripcion.slice(0, 150), -monto);
  return { ...resultado, comprobante: resultado.transaccion.referencia };
}

export interface DatosCuentaEditables {
  nombre?: string;
  tipoCuenta?: string;
  saldo?: number;
  pin?: string;
}

export async function updateDatosCuenta(datos: DatosCuentaEditables): Promise<CuentaPokemon> {
  const cambios: Record<string, string | number> = {};

  if (datos.nombre?.trim()) cambios.nombre_titular = datos.nombre.trim().slice(0, 100);
  if (datos.tipoCuenta?.trim()) cambios.tipo_cuenta = datos.tipoCuenta.trim().slice(0, 50);
  if (datos.saldo !== undefined) {
    if (isNaN(datos.saldo) || datos.saldo < 0) throw new Error("El saldo debe ser un número mayor o igual a 0");
    cambios.saldo_disponible = Math.round(datos.saldo * 100) / 100;
  }
  if (datos.pin) {
    if (!/^\d{4}$/.test(datos.pin)) throw new Error("El PIN debe tener 4 dígitos");
    cambios.pin = datos.pin;
  }

  if (Object.keys(cambios).length > 0) {
    const { error } = await db().from("cuentas").update(cambios).eq("id_cuenta", ID_CUENTA_ATM);
    if (error) {
      throw new Error("No se pudieron guardar los cambios en la base de datos");
    }
  }

  return getCuentaATM();
}
