"use client";

import { useState, useEffect } from "react";

type ServiceType = "main" | "depositar" | "consultar" | "retirar" | "pagar";

// =========================================================================
// 🗄️ MODELO GENÉRICO DE CUENTA BANCARIA POKÉMON (LISTO PARA BASE DE DATOS)
// Compatible con Supabase, PostgreSQL, MySQL o APIs REST.
// =========================================================================
export interface CuentaPokemon {
  id: string;
  idUsuario?: number | null;
  nombre: string;
  tipoCuenta: string;
  numeroCuenta: string;
  saldo: number;
  pinCajero?: string;
  estado?: "ACTIVA" | "BLOQUEADA" | "SUSPENDIDA";
  fotoPerfil: string;
  nivelEntrenador: string;
  limiteRetiroDiario?: number;
}

export interface TransaccionATM {
  id: string;
  numeroCuenta?: string;
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

export default function PokemonBankApp() {
  const [activeScreen, setActiveScreen] = useState<ServiceType>("main");
  const [customAmount, setCustomAmount] = useState<string>("");
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: "success" | "error" | "info" } | null>(null);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [screenSize, setScreenSize] = useState<"normal" | "grande" | "max">("grande");
  const [showDbModal, setShowDbModal] = useState<boolean>(false);
  const [loadingAction, setLoadingAction] = useState<boolean>(false);

  // 🎫 ESTADO DEL COMPROBANTE/TICKET TÉRMICO
  const [activeReceipt, setActiveReceipt] = useState<TransaccionATM | null>(null);

  // 🔑 ESTADO PARA RETIRO CON PIN
  const [withdrawPin, setWithdrawPin] = useState<string>("");
  const [withdrawAmount, setWithdrawAmount] = useState<number | null>(null);
  const [showPinPad, setShowPinPad] = useState<boolean>(false);

  // 🔌 ESTADO GENÉRICO DE LA CUENTA
  const [cuenta, setCuenta] = useState<CuentaPokemon>({
    id: "PKMN-USR-60",
    idUsuario: 60,
    nombre: "JONATAN ALEXANDER ORELLANA HERNANDEZ",
    tipoCuenta: "CUENTA DE AHORRO",
    numeroCuenta: "34526685463256668",
    saldo: 1450250.0,
    pinCajero: "1234",
    fotoPerfil: "/ICONOS%20POKEMON%20BANK/CHARIZARD.png",
    nivelEntrenador: "Nivel Maestro Pokémon ★★★",
    limiteRetiroDiario: 25000.0,
  });

  // Campos para el modal de edición/simulación de DB
  const [editNombre, setEditNombre] = useState(cuenta.nombre);
  const [editNumero, setEditNumero] = useState(cuenta.numeroCuenta);
  const [editTipo, setEditTipo] = useState(cuenta.tipoCuenta);
  const [editSaldo, setEditSaldo] = useState(cuenta.saldo.toString());
  const [editPin, setEditPin] = useState("1234");

  // Lista de servicios de pago
  const [servicios] = useState<ServicioATM[]>([
    { id: "silph_co", nombre: "Silph Co. Electricidad", categoria: "Electricidad", tarifaBase: 850, icono: "⚡" },
    { id: "gym_celeste", nombre: "Gym Celeste (Agua)", categoria: "Agua", tarifaBase: 420, icono: "💧" },
    { id: "poke_net", nombre: "Poké-Net 5G Banda Ancha", categoria: "Telecomunicaciones", tarifaBase: 650, icono: "📶" },
    { id: "centro_pokemon", nombre: "Centro Pokémon Cuota Médica", categoria: "Salud", tarifaBase: 1200, icono: "🏥" },
  ]);
  const [selectedServiceId, setSelectedServiceId] = useState<string>("silph_co");

  // Historial de transacciones
  const [transactions, setTransactions] = useState<TransaccionATM[]>([
    {
      id: "TX-PKMN-901",
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
      tipo: "DEPOSITO",
      monto: 12000,
      saldoAnterior: 1438250,
      saldoPosterior: 1450250,
      descripcion: "Premio Victoria Gimnasio Celeste",
      referencia: "REF-661502",
      estado: "EXITOSA",
      fecha: "10 Oct 2026",
    },
  ]);

  // 🔌 Carga automática desde endpoint de API / Supabase
  const recargarCuenta = async () => {
    try {
      const res = await fetch("/api/cuenta");
      if (res.ok) {
        const data = await res.json();
        setCuenta((prev) => ({ ...prev, ...data }));
        if (data.pinCajero) setEditPin(data.pinCajero);
      }
    } catch (e) {
      console.warn("Usando datos locales de respaldo:", e);
    }
  };

  const recargarTransacciones = async () => {
    try {
      const res = await fetch("/api/atm/transacciones");
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.transacciones) && data.transacciones.length > 0) {
          setTransactions(data.transacciones);
        }
      }
    } catch (e) {
      console.warn("Error cargando transacciones:", e);
    }
  };

  useEffect(() => {
    recargarCuenta();
    recargarTransacciones();
  }, []);

  // Web Audio retro sound effects
  const playSound = (type: "beep" | "success" | "dispense" | "error") => {
    if (!soundEnabled || typeof window === "undefined") return;
    try {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      if (type === "beep") {
        osc.type = "sine";
        osc.frequency.setValueAtTime(880, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(1320, ctx.currentTime + 0.08);
        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.08);
        osc.start();
        osc.stop(ctx.currentTime + 0.08);
      } else if (type === "success") {
        osc.type = "triangle";
        osc.frequency.setValueAtTime(523.25, ctx.currentTime);
        osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.08);
        osc.frequency.setValueAtTime(783.99, ctx.currentTime + 0.16);
        osc.frequency.setValueAtTime(1046.5, ctx.currentTime + 0.24);
        gain.gain.setValueAtTime(0.18, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.38);
        osc.start();
        osc.stop(ctx.currentTime + 0.38);
      } else if (type === "dispense") {
        osc.type = "square";
        osc.frequency.setValueAtTime(400, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + 0.22);
        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.22);
        osc.start();
        osc.stop(ctx.currentTime + 0.22);
      } else {
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(220, ctx.currentTime);
        osc.frequency.setValueAtTime(180, ctx.currentTime + 0.1);
        gain.gain.setValueAtTime(0.2, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25);
        osc.start();
        osc.stop(ctx.currentTime + 0.25);
      }
    } catch {
      // AudioContext policy
    }
  };

  const showToast = (text: string, type: "success" | "error" | "info" = "info", duration = 3000) => {
    setStatusMessage({ text, type });
    setTimeout(() => setStatusMessage(null), duration);
  };

  // =========================================================================
  // 💰 OPERACIÓN: DEPÓSITO
  // =========================================================================
  const handleDeposit = async (amount: number) => {
    if (amount <= 0) {
      playSound("error");
      showToast("Ingrese un monto válido a depositar.", "error");
      return;
    }

    setLoadingAction(true);
    try {
      const res = await fetch("/api/atm/depositar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ monto: amount }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "No se pudo procesar el depósito");
      }

      playSound("success");
      setCuenta(data.cuenta);
      setTransactions((prev) => [data.transaccion, ...prev]);
      setActiveReceipt(data.transaccion);
      showToast(`¡Depósito exitoso de $${amount.toLocaleString("es-MX", { minimumFractionDigits: 2 })}!`, "success", 3000);
      setCustomAmount("");
    } catch (err: unknown) {
      playSound("error");
      const msg = err instanceof Error ? err.message : "Error al depositar";
      showToast(msg, "error");
    } finally {
      setLoadingAction(false);
    }
  };

  // =========================================================================
  // 🏧 OPERACIÓN: RETIRO CON VALIDACIÓN DE PIN
  // =========================================================================
  const iniciarRetiro = (amount: number) => {
    if (amount <= 0) {
      playSound("error");
      showToast("Ingrese un monto válido a retirar.", "error");
      return;
    }
    if (amount > cuenta.saldo) {
      playSound("error");
      showToast("Fondos insuficientes en la cuenta.", "error");
      return;
    }
    if (cuenta.limiteRetiroDiario && amount > cuenta.limiteRetiroDiario) {
      playSound("error");
      showToast(`El monto excede el límite diario ($${cuenta.limiteRetiroDiario.toLocaleString()})`, "error");
      return;
    }

    setWithdrawAmount(amount);
    setWithdrawPin("");
    setShowPinPad(true);
    playSound("beep");
  };

  const confirmarRetiroConPin = async () => {
    if (!withdrawAmount) return;
    if (withdrawPin.length < 4) {
      playSound("error");
      showToast("Por favor ingrese el PIN de 4 dígitos", "error");
      return;
    }

    setLoadingAction(true);
    try {
      const res = await fetch("/api/atm/retirar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ monto: withdrawAmount, pin: withdrawPin }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Error al procesar el retiro");
      }

      playSound("dispense");
      setCuenta(data.cuenta);
      setTransactions((prev) => [data.transaccion, ...prev]);
      setShowPinPad(false);
      setActiveReceipt(data.transaccion);
      showToast(`¡Retiro de $${withdrawAmount.toLocaleString("es-MX", { minimumFractionDigits: 2 })} exitoso! Tome su efectivo.`, "success", 3500);
      setCustomAmount("");
      setWithdrawAmount(null);
      setWithdrawPin("");
    } catch (err: unknown) {
      playSound("error");
      const msg = err instanceof Error ? err.message : "Error al procesar el retiro";
      showToast(msg, "error");
    } finally {
      setLoadingAction(false);
    }
  };

  // =========================================================================
  // ⚡ OPERACIÓN: PAGO DE SERVICIOS
  // =========================================================================
  const handlePayService = async (serviceId: string, customPrice?: number) => {
    const serv = servicios.find((s) => s.id === serviceId);
    if (!serv) return;

    const costo = customPrice || serv.tarifaBase;
    if (costo > cuenta.saldo) {
      playSound("error");
      showToast("Saldo insuficiente para pagar este servicio.", "error");
      return;
    }

    setLoadingAction(true);
    try {
      const res = await fetch("/api/atm/pagar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ servicioId: serviceId, monto: costo }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "No se pudo realizar el pago");
      }

      playSound("success");
      setCuenta(data.cuenta);
      setTransactions((prev) => [data.transaccion, ...prev]);
      setActiveReceipt(data.transaccion);
      showToast(`¡Pago exitoso de ${serv.nombre} por $${costo.toLocaleString("es-MX", { minimumFractionDigits: 2 })}!`, "success", 3000);
    } catch (err: unknown) {
      playSound("error");
      const msg = err instanceof Error ? err.message : "Error al procesar el pago";
      showToast(msg, "error");
    } finally {
      setLoadingAction(false);
    }
  };

  // =========================================================================
  // ⚙️ GUARDAR DATOS EN BACKEND / BASE DE DATOS
  // =========================================================================
  const handleGuardarDatosDB = async () => {
    const nuevoSaldo = parseFloat(editSaldo);
    const payload = {
      nombre: editNombre.trim() || cuenta.nombre,
      numeroCuenta: editNumero.trim() || cuenta.numeroCuenta,
      tipoCuenta: editTipo.trim() || cuenta.tipoCuenta,
      saldo: !isNaN(nuevoSaldo) ? nuevoSaldo : cuenta.saldo,
      pinCajero: editPin.trim() || "1234",
    };

    try {
      const res = await fetch("/api/cuenta", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const data = await res.json();
        setCuenta((prev) => ({ ...prev, ...data.cuenta }));
      } else {
        setCuenta((prev) => ({ ...prev, ...payload }));
      }

      setShowDbModal(false);
      playSound("success");
      showToast("¡Datos de cuenta sincronizados exitosamente!", "success");
    } catch {
      setCuenta((prev) => ({ ...prev, ...payload }));
      setShowDbModal(false);
      playSound("success");
      showToast("Datos actualizados localmente", "info");
    }
  };

  const toggleFullscreen = () => {
    if (typeof document === "undefined") return;
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  const getContainerStyle = () => {
    switch (screenSize) {
      case "normal":
        return {
          width: "min(95vw, calc(80vh * 4016 / 2920))",
          maxWidth: "1024px",
          aspectRatio: "4016 / 2920",
        };
      case "max":
        return {
          width: "min(99vw, calc(95vh * 4016 / 2920))",
          maxWidth: "1680px",
          aspectRatio: "4016 / 2920",
        };
      case "grande":
      default:
        return {
          width: "min(98vw, calc(90vh * 4016 / 2920))",
          maxWidth: "1440px",
          aspectRatio: "4016 / 2920",
        };
    }
  };

  return (
    <main className="min-h-screen w-full flex flex-col items-center justify-center p-1 sm:p-2 md:p-3 bg-gradient-to-br from-slate-950 via-[#0d1527] to-[#1e0d16] select-none text-black">
      {/* Barra superior de herramientas y controles */}
      <div
        className="w-full flex items-center justify-between mb-1.5 px-2 text-xs text-slate-400 transition-all duration-300"
        style={{ maxWidth: getContainerStyle().maxWidth }}
      >
        <div className="flex items-center gap-2">
          <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
          <span className="font-orbitron font-semibold tracking-wider text-slate-300">
            POKÉMON BANK ATM v3.0 • EN LÍNEA
          </span>
          <span className="hidden sm:inline-flex items-center gap-1.5 text-[10px] font-mono text-emerald-400 bg-emerald-950/70 border border-emerald-700/60 px-2 py-0.5 rounded-full">
            ● Supabase: vknqulxhybbjaqhdttie
          </span>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Botón para abrir configuración de Base de Datos */}
          <button
            onClick={() => {
              playSound("beep");
              setEditNombre(cuenta.nombre);
              setEditNumero(cuenta.numeroCuenta);
              setEditTipo(cuenta.tipoCuenta);
              setEditSaldo(cuenta.saldo.toString());
              setEditPin(cuenta.pinCajero || "1234");
              setShowDbModal(true);
            }}
            className="flex items-center gap-1.5 bg-indigo-950/80 hover:bg-indigo-900 border border-indigo-700/60 text-indigo-300 hover:text-white px-2.5 py-1 rounded text-[10px] sm:text-xs font-orbitron font-semibold transition-all cursor-pointer shadow-xs"
            title="Configuración de campos y tablas de Base de Datos"
          >
            <span>🔌</span>
            <span>Tablas & BD</span>
          </button>

          {/* Selector de Tamaño de Pantalla */}
          <div className="flex items-center gap-1 bg-slate-900/80 backdrop-blur px-2 py-0.5 rounded-lg border border-slate-700/60">
            <span className="text-[10px] sm:text-xs text-slate-400 font-semibold mr-1">Pantalla:</span>
            <button
              onClick={() => {
                playSound("beep");
                setScreenSize("normal");
              }}
              className={`px-1.5 py-0.5 rounded text-[10px] sm:text-xs font-orbitron transition-all cursor-pointer ${
                screenSize === "normal"
                  ? "bg-sky-600 text-white font-bold"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Normal
            </button>
            <button
              onClick={() => {
                playSound("beep");
                setScreenSize("grande");
              }}
              className={`px-1.5 py-0.5 rounded text-[10px] sm:text-xs font-orbitron transition-all cursor-pointer ${
                screenSize === "grande"
                  ? "bg-sky-600 text-white font-bold"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Grande
            </button>
            <button
              onClick={() => {
                playSound("beep");
                setScreenSize("max");
              }}
              className={`px-1.5 py-0.5 rounded text-[10px] sm:text-xs font-orbitron transition-all cursor-pointer ${
                screenSize === "max"
                  ? "bg-sky-600 text-white font-bold"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Máx
            </button>
            <button
              onClick={() => {
                playSound("beep");
                toggleFullscreen();
              }}
              className="ml-1 px-1.5 py-0.5 rounded text-[10px] sm:text-xs font-orbitron bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition-all cursor-pointer"
              title="Pantalla Completa"
            >
              ⛶ Full
            </button>
          </div>

          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="hover:text-white transition-colors cursor-pointer flex items-center gap-1 text-[11px] sm:text-xs text-slate-400"
            title="Alternar Sonido"
          >
            <span>{soundEnabled ? "🔊 ON" : "🔇 OFF"}</span>
          </button>

          {activeScreen !== "main" && (
            <button
              onClick={() => {
                playSound("beep");
                setActiveScreen("main");
                setShowPinPad(false);
              }}
              className="bg-red-600/90 hover:bg-red-600 text-white px-2.5 py-1 rounded font-orbitron font-bold text-[10px] tracking-wider transition-colors cursor-pointer"
            >
              ← MENÚ PRINCIPAL
            </button>
          )}
        </div>
      </div>

      {/* Main Container - Keeps Pokedex exact aspect ratio 4016:2920 */}
      <div
        className="relative pokedex-glow transition-all duration-300 my-auto"
        style={getContainerStyle()}
      >
        {/* ========================================================= */}
        {/* 1. SCREEN LAYER (z-10) Inside transparent cutout */}
        {/* Coordinates: left: 10.2%, top: 22.2%, width: 81.8%, height: 68.0% */}
        {/* ========================================================= */}
        <div
          className="absolute z-10 bg-white overflow-hidden flex flex-col"
          style={{
            left: "10.2%",
            top: "22.2%",
            width: "81.8%",
            height: "68.0%",
            borderRadius: "14px",
          }}
        >
          {/* Toast de notificación rápida */}
          {statusMessage && (
            <div
              className={`absolute top-2 left-4 right-4 z-50 px-4 py-2 rounded-xl font-orbitron text-xs sm:text-sm text-center shadow-xl border animate-bounce ${
                statusMessage.type === "success"
                  ? "bg-emerald-950/95 text-emerald-300 border-emerald-500"
                  : statusMessage.type === "error"
                  ? "bg-rose-950/95 text-rose-300 border-rose-500"
                  : "bg-slate-900/95 text-sky-300 border-sky-500"
              }`}
            >
              {statusMessage.text}
            </div>
          )}

          {/* PANTALLA PRINCIPAL (Fiel a la imagen de referencia original) */}
          {activeScreen === "main" && (
            <div className="w-full h-full flex flex-col justify-between p-[3.5%] sm:p-[4%]">
              {/* TOP ROW: Charizard Box + User Details */}
              <div className="flex items-center gap-[4%] w-full">
                {/* Charizard Silhouette in 1px dashed box with border-radius */}
                <div
                  className="w-[21%] aspect-square rounded-2xl border-[1px] border-dashed border-zinc-600/80 flex items-center justify-center p-[4%] bg-white flex-shrink-0 shadow-xs"
                >
                  <img
                    src={cuenta.fotoPerfil}
                    alt="Charizard"
                    className="w-full h-full object-contain pointer-events-none select-none"
                    draggable={false}
                  />
                </div>

                {/* User Info (Campos genéricos vinculados a base de datos) */}
                <div className="flex flex-col justify-center min-w-0 flex-1">
                  <h1 className="font-orbitron font-black text-black leading-tight tracking-wider text-[clamp(13px,1.9vw,28px)] uppercase truncate">
                    {cuenta.nombre}
                  </h1>
                  <p className="font-sans font-medium text-zinc-800 tracking-wide mt-[1.5%] text-[clamp(11px,1.5vw,22px)] uppercase">
                    {cuenta.tipoCuenta}
                  </p>
                  <p className="font-sans font-normal text-zinc-800 tracking-wider mt-[1%] text-[clamp(11px,1.5vw,22px)]">
                    {cuenta.numeroCuenta}
                  </p>
                </div>
              </div>

              {/* QUESTION PROMPT */}
              <div className="w-full pt-[0.5%]">
                <h2 className="font-orbitron font-extrabold text-black text-[clamp(12px,1.75vw,25px)]">
                  ¿Que servicio necesitar realizar?
                </h2>
              </div>

              {/* 4 ACTION BUTTONS GRID (CON ICONOS VERDES DE LA CARPETA ICONOS POKEMON BANK) */}
              <div className="grid grid-cols-2 gap-x-[3.8%] gap-y-[3.5%] w-full pb-[1%]">
                {/* 1. Depositar - Usa PedirDinero.png */}
                <button
                  onClick={() => {
                    playSound("beep");
                    setActiveScreen("depositar");
                  }}
                  className="group flex items-center gap-[6%] px-[6%] py-[4.2%] rounded-xl sm:rounded-2xl border-2 border-[#548092] bg-white hover:border-[#2f677d] hover:bg-slate-50/90 active:scale-[0.98] transition-all cursor-pointer shadow-xs hover:shadow-md"
                >
                  <div className="w-[18%] max-w-[48px] aspect-[4/3] flex items-center justify-center flex-shrink-0">
                    <img
                      src="/ICONOS%20POKEMON%20BANK/PedirDinero.png"
                      alt="Depositar"
                      className="w-full h-full object-contain group-hover:scale-105 transition-transform"
                    />
                  </div>
                  <span className="font-orbitron font-black text-black tracking-wide text-[clamp(12px,1.7vw,24px)] leading-none">
                    Depositar
                  </span>
                </button>

                {/* 2. Consultar saldo - Usa Monedero.png */}
                <button
                  onClick={() => {
                    playSound("beep");
                    setActiveScreen("consultar");
                    recargarTransacciones();
                  }}
                  className="group flex items-center gap-[6%] px-[6%] py-[4.2%] rounded-xl sm:rounded-2xl border-2 border-[#548092] bg-white hover:border-[#2f677d] hover:bg-slate-50/90 active:scale-[0.98] transition-all cursor-pointer shadow-xs hover:shadow-md"
                >
                  <div className="w-[18%] max-w-[48px] aspect-[4/3] flex items-center justify-center flex-shrink-0">
                    <img
                      src="/ICONOS%20POKEMON%20BANK/Monedero.png"
                      alt="Consultar saldo"
                      className="w-full h-full object-contain group-hover:scale-105 transition-transform"
                    />
                  </div>
                  <span className="font-orbitron font-black text-black tracking-wide text-[clamp(12px,1.7vw,24px)] leading-none">
                    Consultar saldo
                  </span>
                </button>

                {/* 3. Retirar - Usa RetirarDinero.png */}
                <button
                  onClick={() => {
                    playSound("beep");
                    setActiveScreen("retirar");
                    setShowPinPad(false);
                    setWithdrawAmount(null);
                  }}
                  className="group flex items-center gap-[6%] px-[6%] py-[4.2%] rounded-xl sm:rounded-2xl border-2 border-[#548092] bg-white hover:border-[#2f677d] hover:bg-slate-50/90 active:scale-[0.98] transition-all cursor-pointer shadow-xs hover:shadow-md"
                >
                  <div className="w-[18%] max-w-[48px] aspect-[4/3] flex items-center justify-center flex-shrink-0">
                    <img
                      src="/ICONOS%20POKEMON%20BANK/RetirarDinero.png"
                      alt="Retirar"
                      className="w-full h-full object-contain group-hover:scale-105 transition-transform"
                    />
                  </div>
                  <span className="font-orbitron font-black text-black tracking-wide text-[clamp(12px,1.7vw,24px)] leading-none">
                    Retirar
                  </span>
                </button>

                {/* 4. Pagar servicios - Usa PagarServicios.png */}
                <button
                  onClick={() => {
                    playSound("beep");
                    setActiveScreen("pagar");
                  }}
                  className="group flex items-center gap-[6%] px-[6%] py-[4.2%] rounded-xl sm:rounded-2xl border-2 border-[#548092] bg-white hover:border-[#2f677d] hover:bg-slate-50/90 active:scale-[0.98] transition-all cursor-pointer shadow-xs hover:shadow-md"
                >
                  <div className="w-[18%] max-w-[48px] aspect-[4/3] flex items-center justify-center flex-shrink-0">
                    <img
                      src="/ICONOS%20POKEMON%20BANK/PagarServicios.png"
                      alt="Pagar servicios"
                      className="w-full h-full object-contain group-hover:scale-105 transition-transform"
                    />
                  </div>
                  <span className="font-orbitron font-black text-black tracking-wide text-[clamp(12px,1.7vw,24px)] leading-none">
                    Pagar servicios
                  </span>
                </button>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* PANTALLA: DEPOSITAR DINERO EN CAJERO */}
          {/* ========================================================= */}
          {activeScreen === "depositar" && (
            <div className="w-full h-full flex flex-col justify-between p-[4%] bg-slate-50 text-slate-900">
              <div className="flex items-center justify-between border-b pb-2 border-slate-300">
                <div className="flex items-center gap-2">
                  <span className="text-emerald-600 font-bold font-orbitron text-sm sm:text-base">
                    [+] RANURA DE DEPÓSITO DE EFECTIVO
                  </span>
                </div>
                <button
                  onClick={() => setActiveScreen("main")}
                  className="text-xs font-orbitron font-bold text-slate-500 hover:text-red-600 transition-colors cursor-pointer"
                >
                  ✕ CANCELAR
                </button>
              </div>

              <div className="text-center my-auto">
                <p className="text-xs text-slate-500 font-medium">Saldo actual disponible en cuenta</p>
                <p className="font-orbitron font-black text-xl sm:text-2xl text-emerald-700">
                  ${cuenta.saldo.toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                </p>

                <p className="font-orbitron font-bold text-xs sm:text-sm text-slate-700 mt-3 mb-2">
                  Seleccione billetes a ingresar en la tolva:
                </p>

                <div className="grid grid-cols-4 gap-2 max-w-lg mx-auto mb-3">
                  {[200, 500, 1000, 5000].map((amt) => (
                    <button
                      key={amt}
                      disabled={loadingAction}
                      onClick={() => handleDeposit(amt)}
                      className="py-2.5 bg-white border border-[#548092] hover:bg-emerald-50 hover:border-emerald-600 rounded-lg font-orbitron font-bold text-xs sm:text-sm text-slate-800 transition-all cursor-pointer shadow-xs active:scale-95 disabled:opacity-50"
                    >
                      +${amt.toLocaleString()}
                    </button>
                  ))}
                </div>

                <div className="flex items-center justify-center gap-2 max-w-xs mx-auto">
                  <input
                    type="number"
                    placeholder="Monto personalizado..."
                    value={customAmount}
                    onChange={(e) => setCustomAmount(e.target.value)}
                    disabled={loadingAction}
                    className="w-44 px-3 py-1.5 text-xs sm:text-sm border border-slate-300 rounded-lg font-orbitron focus:outline-none focus:border-emerald-600 bg-white"
                  />
                  <button
                    disabled={loadingAction}
                    onClick={() => {
                      const val = parseFloat(customAmount);
                      if (val > 0) handleDeposit(val);
                    }}
                    className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-orbitron font-bold text-xs rounded-lg transition-colors cursor-pointer disabled:opacity-50 shadow-xs"
                  >
                    {loadingAction ? "..." : "Ingresar"}
                  </button>
                </div>
              </div>

              <div className="flex justify-between items-center pt-2 border-t border-slate-200">
                <button
                  onClick={() => setActiveScreen("main")}
                  className="font-orbitron text-xs text-slate-600 hover:text-black font-semibold cursor-pointer"
                >
                  ← Volver al Menú
                </button>
                <span className="text-[10px] font-mono text-slate-400">
                  Cajero: ATM-POKEDEX-01 • Acepta billetes Pokémon
                </span>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* PANTALLA: CONSULTAR SALDO Y MOVIMIENTOS */}
          {/* ========================================================= */}
          {activeScreen === "consultar" && (
            <div className="w-full h-full flex flex-col justify-between p-[4%] bg-slate-50 text-slate-900">
              <div className="flex items-center justify-between border-b pb-2 border-slate-300">
                <span className="text-sky-700 font-bold font-orbitron text-sm sm:text-base">
                  ESTADO DE CUENTA & MOVIMIENTOS RECIENTES
                </span>
                <span className="text-[11px] font-mono text-slate-500">
                  {new Date().toLocaleDateString("es-MX")} • ATM-01
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 my-auto py-2">
                {/* Tarjeta de información de la cuenta */}
                <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
                  <div>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                      Titular de la cuenta
                    </p>
                    <p className="font-orbitron font-extrabold text-xs sm:text-sm text-black leading-tight">
                      {cuenta.nombre}
                    </p>
                    <p className="text-[11px] text-slate-600 mt-1">Cuenta: {cuenta.numeroCuenta}</p>
                    <p className="text-[11px] text-slate-600">Tipo: {cuenta.tipoCuenta}</p>
                    <span className="inline-block mt-1 px-1.5 py-0.5 rounded text-[9px] font-orbitron font-bold bg-amber-100 text-amber-800">
                      {cuenta.nivelEntrenador}
                    </span>
                  </div>

                  <div className="mt-2 pt-2 border-t border-slate-100">
                    <p className="text-[10px] text-slate-500 font-semibold">Saldo Disponible en Cajero:</p>
                    <p className="font-orbitron font-black text-lg sm:text-xl text-sky-800">
                      ${cuenta.saldo.toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                </div>

                {/* Libro contable / Historial de transacciones */}
                <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs flex flex-col">
                  <div className="flex items-center justify-between mb-1.5">
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                      Últimos Movimientos
                    </p>
                    <span className="text-[9px] text-slate-400 font-mono">
                      {transactions.length} registros
                    </span>
                  </div>
                  <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 max-h-[140px]">
                    {transactions.slice(0, 5).map((tx) => (
                      <div
                        key={tx.id}
                        onClick={() => setActiveReceipt(tx)}
                        className="flex items-center justify-between text-[11px] border-b border-slate-100 pb-1 hover:bg-slate-50 p-1 rounded cursor-pointer transition-colors"
                        title="Click para ver comprobante"
                      >
                        <div className="truncate mr-2">
                          <p className="font-medium text-slate-800 truncate leading-tight">{tx.descripcion}</p>
                          <span className="text-[9px] text-slate-400">{tx.fecha} • {tx.referencia}</span>
                        </div>
                        <span
                          className={`font-orbitron font-bold whitespace-nowrap text-xs ${
                            tx.tipo === "DEPOSITO" ? "text-emerald-600" : "text-rose-600"
                          }`}
                        >
                          {tx.tipo === "DEPOSITO" ? "+" : "-"}${tx.monto.toLocaleString()}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex justify-between items-center pt-2 border-t border-slate-200 text-xs">
                <button
                  onClick={() => setActiveScreen("main")}
                  className="font-orbitron text-xs text-slate-600 hover:text-black font-semibold cursor-pointer"
                >
                  ← Volver al Menú
                </button>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      playSound("beep");
                      setActiveReceipt(transactions[0] || null);
                    }}
                    className="bg-[#548092] hover:bg-[#38677a] text-white px-3 py-1 rounded font-orbitron font-bold text-[10px] tracking-wider transition-colors cursor-pointer"
                  >
                    🖨 IMPRIMIR SALDO
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* PANTALLA: RETIRO DE EFECTIVO CON VALIDACIÓN DE PIN */}
          {/* ========================================================= */}
          {activeScreen === "retirar" && (
            <div className="w-full h-full flex flex-col justify-between p-[4%] bg-slate-50 text-slate-900">
              <div className="flex items-center justify-between border-b pb-2 border-slate-300">
                <span className="text-amber-600 font-bold font-orbitron text-sm sm:text-base">
                  [-] DISPENSADOR AUTOMÁTICO DE EFECTIVO
                </span>
                <button
                  onClick={() => {
                    setActiveScreen("main");
                    setShowPinPad(false);
                  }}
                  className="text-xs font-orbitron font-bold text-slate-500 hover:text-red-600 transition-colors cursor-pointer"
                >
                  ✕ CANCELAR
                </button>
              </div>

              {!showPinPad ? (
                // Paso 1: Selección de monto a retirar
                <div className="text-center my-auto">
                  <p className="text-xs text-slate-500">Saldo disponible</p>
                  <p className="font-orbitron font-bold text-lg text-slate-800">
                    ${cuenta.saldo.toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                  </p>

                  <p className="font-orbitron font-bold text-xs sm:text-sm text-slate-700 mt-2 mb-2">
                    Seleccione el monto que desea retirar:
                  </p>

                  <div className="grid grid-cols-4 gap-2 max-w-lg mx-auto mb-3">
                    {[100, 200, 500, 1000].map((amt) => (
                      <button
                        key={amt}
                        onClick={() => iniciarRetiro(amt)}
                        className="py-2.5 bg-white border border-[#548092] hover:bg-amber-50 hover:border-amber-600 rounded-lg font-orbitron font-bold text-xs sm:text-sm text-slate-800 transition-all cursor-pointer shadow-xs active:scale-95"
                      >
                        ${amt}
                      </button>
                    ))}
                  </div>

                  <div className="flex items-center justify-center gap-2 max-w-xs mx-auto">
                    <input
                      type="number"
                      placeholder="Monto personalizado"
                      value={customAmount}
                      onChange={(e) => setCustomAmount(e.target.value)}
                      className="w-44 px-3 py-1.5 text-xs sm:text-sm border border-slate-300 rounded-lg font-orbitron focus:outline-none focus:border-amber-600 bg-white"
                    />
                    <button
                      onClick={() => {
                        const val = parseFloat(customAmount);
                        if (val > 0) iniciarRetiro(val);
                      }}
                      className="px-4 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-orbitron font-bold text-xs rounded-lg transition-colors cursor-pointer shadow-xs"
                    >
                      Continuar
                    </button>
                  </div>
                </div>
              ) : (
                // Paso 2: Teclado numérico de seguridad PIN
                <div className="my-auto max-w-xs mx-auto text-center bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm">
                  <div className="flex items-center justify-center gap-1.5 text-amber-700 font-orbitron font-bold text-xs mb-1">
                    <span>🔒</span>
                    <span>INGRESE PIN DE SEGURIDAD</span>
                  </div>
                  <p className="text-[11px] text-slate-500 mb-2">
                    Monto a retirar: <strong className="text-black font-orbitron">${withdrawAmount?.toLocaleString()}</strong>
                  </p>

                  {/* Indicador de 4 dígitos */}
                  <div className="flex justify-center gap-2.5 mb-3">
                    {[0, 1, 2, 3].map((idx) => (
                      <div
                        key={idx}
                        className={`w-7 h-8 border-2 rounded-md flex items-center justify-center text-lg font-bold font-mono transition-all ${
                          withdrawPin.length > idx
                            ? "border-amber-600 bg-amber-50 text-amber-800"
                            : "border-slate-300 bg-slate-50 text-slate-300"
                        }`}
                      >
                        {withdrawPin.length > idx ? "•" : ""}
                      </div>
                    ))}
                  </div>

                  {/* Teclado en pantalla del ATM */}
                  <div className="grid grid-cols-3 gap-1.5 max-w-[200px] mx-auto mb-2">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, "C", 0, "⌫"].map((keyVal) => (
                      <button
                        key={String(keyVal)}
                        onClick={() => {
                          playSound("beep");
                          if (keyVal === "C") {
                            setWithdrawPin("");
                          } else if (keyVal === "⌫") {
                            setWithdrawPin((prev) => prev.slice(0, -1));
                          } else if (withdrawPin.length < 4) {
                            setWithdrawPin((prev) => prev + String(keyVal));
                          }
                        }}
                        className="py-1.5 bg-slate-100 hover:bg-slate-200 active:bg-amber-100 rounded text-xs font-orbitron font-bold text-slate-800 transition-colors cursor-pointer border border-slate-200"
                      >
                        {keyVal}
                      </button>
                    ))}
                  </div>

                  <p className="text-[10px] text-slate-400 font-mono mb-2">
                    PIN por defecto: <strong className="text-amber-700">1234</strong>
                  </p>

                  <div className="flex gap-2 justify-center">
                    <button
                      onClick={() => setShowPinPad(false)}
                      className="px-3 py-1 text-[11px] font-orbitron text-slate-600 hover:text-black cursor-pointer"
                    >
                      Atrás
                    </button>
                    <button
                      disabled={loadingAction || withdrawPin.length !== 4}
                      onClick={confirmarRetiroConPin}
                      className="px-4 py-1.5 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white font-orbitron font-bold text-xs rounded-lg transition-colors cursor-pointer shadow-xs"
                    >
                      {loadingAction ? "Dispensando..." : "Confirmar Retiro"}
                    </button>
                  </div>
                </div>
              )}

              <div className="flex justify-between items-center pt-2 border-t border-slate-200">
                <button
                  onClick={() => {
                    setActiveScreen("main");
                    setShowPinPad(false);
                  }}
                  className="font-orbitron text-xs text-slate-600 hover:text-black font-semibold cursor-pointer"
                >
                  ← Volver al Menú
                </button>
                <span className="text-[10px] text-slate-400 font-mono">
                  Límite diario: ${cuenta.limiteRetiroDiario?.toLocaleString() || "25,000"}
                </span>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* PANTALLA: PAGO DE SERVICIOS */}
          {/* ========================================================= */}
          {activeScreen === "pagar" && (
            <div className="w-full h-full flex flex-col justify-between p-[4%] bg-slate-50 text-slate-900">
              <div className="flex items-center justify-between border-b pb-2 border-slate-300">
                <span className="text-indigo-700 font-bold font-orbitron text-sm sm:text-base">
                  PAGO DE SERVICIOS DE LA REGIÓN KANTO
                </span>
                <span className="text-xs font-orbitron text-slate-600">
                  Saldo: ${cuenta.saldo.toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 my-auto py-1">
                {servicios.map((serv) => (
                  <div
                    key={serv.id}
                    className={`p-2.5 rounded-xl border transition-all cursor-pointer bg-white flex items-center justify-between ${
                      selectedServiceId === serv.id
                        ? "border-indigo-600 ring-2 ring-indigo-200"
                        : "border-slate-200 hover:border-slate-300"
                    }`}
                    onClick={() => {
                      playSound("beep");
                      setSelectedServiceId(serv.id);
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{serv.icono}</span>
                      <div>
                        <p className="font-semibold text-xs text-slate-800 leading-tight">{serv.nombre}</p>
                        <p className="text-[10px] text-slate-400">{serv.categoria}</p>
                        <p className="text-[11px] font-orbitron font-bold text-indigo-700 mt-0.5">
                          ${serv.tarifaBase}.00
                        </p>
                      </div>
                    </div>
                    <button
                      disabled={loadingAction}
                      onClick={(e) => {
                        e.stopPropagation();
                        handlePayService(serv.id);
                      }}
                      className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg font-orbitron font-bold text-[10px] tracking-wider transition-colors cursor-pointer shadow-xs active:scale-95"
                    >
                      Pagar
                    </button>
                  </div>
                ))}
              </div>

              <div className="flex justify-between items-center pt-2 border-t border-slate-200">
                <button
                  onClick={() => setActiveScreen("main")}
                  className="font-orbitron text-xs text-slate-600 hover:text-black font-semibold cursor-pointer"
                >
                  ← Volver al Menú
                </button>
                <span className="text-[10px] text-slate-400 font-mono">
                  Pagos procesados vía Silph Co. Network
                </span>
              </div>
            </div>
          )}
        </div>

        {/* ========================================================= */}
        {/* 2. POKEDEX FRAME OVERLAY (z-20) */}
        {/* Uses the public/assets/POKEDEX.png file */}
        {/* ========================================================= */}
        <img
          src="/assets/POKEDEX.png"
          alt="Pokedex Frame"
          className="absolute inset-0 w-full h-full object-fill pointer-events-none select-none z-20"
          draggable={false}
        />

        {/* ========================================================= */}
        {/* 3. POKEMON BANK LOGO (z-30) */}
        {/* Uses the public/assets/POKEMON BANK PNG.png file */}
        {/* ========================================================= */}
        <div
          className="absolute z-30 pointer-events-auto"
          style={{
            left: "34.08%",
            top: "1.75%",
            width: "25.68%",
          }}
        >
          <img
            src="/assets/POKEMON BANK PNG.png"
            alt="Pokémon Bank"
            className="w-full h-auto object-contain select-none drop-shadow-md cursor-pointer hover:scale-[1.02] transition-transform"
            draggable={false}
            onClick={() => {
              playSound("beep");
              setActiveScreen("main");
            }}
          />
        </div>
      </div>

      {/* ========================================================= */}
      {/* 4. MODAL DE TICKET / COMPROBANTE TÉRMICO DE LA OPERACIÓN */}
      {/* ========================================================= */}
      {activeReceipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4">
          <div className="bg-amber-50 text-slate-900 rounded-xl w-full max-w-sm p-5 font-mono shadow-2xl border-2 border-amber-200 relative">
            <div className="text-center border-b-2 border-dashed border-slate-400 pb-3 mb-3">
              <h4 className="font-orbitron font-black text-sm tracking-wider text-slate-900">
                POKÉMON BANK ATM
              </h4>
              <p className="text-[10px] text-slate-600">SUCURSAL CIUDAD CELESTE #01</p>
              <p className="text-[10px] text-slate-500 font-mono mt-0.5">
                {activeReceipt.fecha}
              </p>
            </div>

            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-600">Operación:</span>
                <span className="font-bold text-black">{activeReceipt.tipo}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Descripción:</span>
                <span className="font-semibold text-right truncate max-w-[170px]">{activeReceipt.descripcion}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Referencia:</span>
                <span className="font-bold font-mono">{activeReceipt.referencia}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Titular:</span>
                <span className="truncate max-w-[170px]">{cuenta.nombre}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">No. Cuenta:</span>
                <span>{cuenta.numeroCuenta}</span>
              </div>

              <div className="border-t border-dashed border-slate-300 my-2 pt-2">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-600">Monto:</span>
                  <span className="font-orbitron font-bold text-sm text-slate-900">
                    ${activeReceipt.monto.toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex justify-between text-[11px] text-slate-500 mt-0.5">
                  <span>Saldo Anterior:</span>
                  <span>${activeReceipt.saldoAnterior.toLocaleString("es-MX", { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between text-xs font-bold text-emerald-800 mt-0.5">
                  <span>Saldo Posterior:</span>
                  <span>${activeReceipt.saldoPosterior.toLocaleString("es-MX", { minimumFractionDigits: 2 })}</span>
                </div>
              </div>
            </div>

            <div className="border-t-2 border-dashed border-slate-400 mt-4 pt-3 text-center">
              <p className="text-[10px] text-slate-500">
                ¡Gracias por utilizar la red de Cajeros Pokémon Bank!
              </p>
              <p className="text-[9px] font-mono text-slate-400 mt-1">
                AUT: {activeReceipt.referencia} • CAJERO POKEDEX-01
              </p>
            </div>

            <div className="flex justify-between gap-2 mt-4 pt-2 border-t border-slate-200">
              <button
                onClick={() => {
                  playSound("beep");
                  setActiveReceipt(null);
                }}
                className="flex-1 py-1.5 bg-slate-300 hover:bg-slate-400 text-slate-800 font-orbitron font-semibold text-xs rounded transition-colors cursor-pointer"
              >
                Cerrar
              </button>
              <button
                onClick={() => {
                  playSound("success");
                  if (typeof window !== "undefined") window.print();
                }}
                className="flex-1 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white font-orbitron font-bold text-xs rounded transition-colors cursor-pointer"
              >
                🖨 Imprimir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 5. MODAL PARA CONFIGURACIÓN DE TABLAS Y BASE DE DATOS */}
      {/* ========================================================= */}
      {showDbModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg p-6 text-slate-200 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <span className="text-xl">🗄️</span>
                <h3 className="font-orbitron font-bold text-sm text-white">
                  Base de Datos & Esquema Supabase
                </h3>
              </div>
              <button
                onClick={() => setShowDbModal(false)}
                className="text-slate-400 hover:text-white font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="bg-emerald-950/40 border border-emerald-700/50 rounded-xl p-3 mb-4 text-xs">
              <div className="flex items-center gap-2 text-emerald-400 font-semibold mb-1">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                <span>Conexión MCP Supabase: vknqulxhybbjaqhdttie</span>
              </div>
              <p className="text-[11px] text-slate-300">
                Usuario en BD: <code className="text-emerald-300">User.ID_User: 60</code> (Jona • jonatanorellana94@gmail.com).
              </p>
              <p className="text-[10px] text-slate-400 mt-1">
                Script SQL con todas las tablas guardado en: <code className="text-amber-300">pokemon-bank/supabase_pokemon_bank.sql</code>
              </p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-[11px] font-orbitron font-semibold text-slate-300 mb-1">
                  Nombre del Titular (nombre):
                </label>
                <input
                  type="text"
                  value={editNombre}
                  onChange={(e) => setEditNombre(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs font-orbitron text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-orbitron font-semibold text-slate-300 mb-1">
                    Tipo de Cuenta (tipoCuenta):
                  </label>
                  <input
                    type="text"
                    value={editTipo}
                    onChange={(e) => setEditTipo(e.target.value)}
                    className="w-full px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-orbitron font-semibold text-slate-300 mb-1">
                    PIN del Cajero (pinCajero):
                  </label>
                  <input
                    type="text"
                    maxLength={4}
                    value={editPin}
                    onChange={(e) => setEditPin(e.target.value)}
                    className="w-full px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs font-mono text-amber-300 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-orbitron font-semibold text-slate-300 mb-1">
                  Número de Cuenta (numeroCuenta):
                </label>
                <input
                  type="text"
                  value={editNumero}
                  onChange={(e) => setEditNumero(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs font-mono text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-orbitron font-semibold text-slate-300 mb-1">
                  Saldo en Cuenta (saldo):
                </label>
                <input
                  type="number"
                  value={editSaldo}
                  onChange={(e) => setEditSaldo(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs font-orbitron text-emerald-400 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-800">
              <p className="text-[11px] font-semibold text-slate-300 mb-1.5">Tablas del ATM incluidas:</p>
              <div className="grid grid-cols-2 gap-1.5 text-[10px] font-mono">
                <span className="bg-slate-800/80 px-2 py-1 rounded text-sky-300">✓ pokemon_bank_cuentas</span>
                <span className="bg-slate-800/80 px-2 py-1 rounded text-sky-300">✓ pokemon_bank_transacciones</span>
                <span className="bg-slate-800/80 px-2 py-1 rounded text-sky-300">✓ pokemon_bank_servicios</span>
                <span className="bg-slate-800/80 px-2 py-1 rounded text-sky-300">✓ pokemon_bank_pagos</span>
              </div>
            </div>

            <div className="flex justify-end gap-2.5 mt-5 pt-3 border-t border-slate-800">
              <button
                onClick={() => setShowDbModal(false)}
                className="px-3.5 py-1.5 rounded-lg text-xs font-orbitron text-slate-400 hover:text-white cursor-pointer"
              >
                Cerrar
              </button>
              <button
                onClick={handleGuardarDatosDB}
                className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-orbitron font-bold transition-colors cursor-pointer shadow-md"
              >
                Guardar en BD
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer Info */}
      <footer className="mt-3 text-center text-xs text-slate-500 font-sans">
        Pokémon Bank Terminal Interface • ATM 100% Funcional con Depósitos, Retiros, Consultas y Pagos
      </footer>
    </main>
  );
}
