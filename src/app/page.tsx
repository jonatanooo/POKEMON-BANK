"use client";

import { useState, useEffect } from "react";
import type { CuentaPokemon, TransaccionATM, ServicioATM } from "@/lib/atm-service";

type ServiceType = "main" | "depositar" | "consultar" | "retirar" | "pagar";

const ETIQUETA_TIPO: Record<TransaccionATM["tipo"], string> = {
  DEPOSITO: "DEPÓSITO",
  RETIRO: "RETIRO",
  PAGO_SERVICIO: "PAGO DE SERVICIO",
};

// Cuenta vacía mientras carga
const CUENTA_VACIA: CuentaPokemon = {
  numeroCuenta: "—",
  nombre: "Conectando...",
  tipoCuenta: "",
  saldo: 0,
  estado: "",
  fotoPerfil: "/ICONOS%20POKEMON%20BANK/CHARIZARD.png",
  nivelEntrenador: "",
  limiteRetiroDiario: 0,
};

const COLOR_PIN = {
  amber: { titulo: "text-amber-700", digito: "border-amber-600 bg-amber-50 text-amber-800", boton: "bg-amber-600 hover:bg-amber-700" },
  emerald: { titulo: "text-emerald-700", digito: "border-emerald-600 bg-emerald-50 text-emerald-800", boton: "bg-emerald-600 hover:bg-emerald-700" },
};

// Teclado de PIN para depósitos y retiros
function TecladoPin(props: {
  pin: string;
  setPin: (pin: string) => void;
  etiquetaMonto: string;
  monto: number;
  textoBoton: string;
  textoCargando: string;
  cargando: boolean;
  color: keyof typeof COLOR_PIN;
  onTecla: () => void;
  onAtras: () => void;
  onConfirmar: () => void;
}) {
  const { pin, setPin, cargando } = props;
  const color = COLOR_PIN[props.color];

  return (
    <div className="my-auto max-w-xs mx-auto text-center bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm">
      <div className={`flex items-center justify-center gap-1.5 font-orbitron font-bold text-xs mb-1 ${color.titulo}`}>
        <span>🔒</span>
        <span>INGRESE PIN DE SEGURIDAD</span>
      </div>
      <p className="text-[11px] text-slate-500 mb-2">
        {props.etiquetaMonto}:{" "}
        <strong className="text-black font-orbitron">
          ${props.monto.toLocaleString("es-MX", { minimumFractionDigits: 2 })}
        </strong>
      </p>

      <div className="flex justify-center gap-2.5 mb-3">
        {[0, 1, 2, 3].map((idx) => (
          <div
            key={idx}
            className={`w-7 h-8 border-2 rounded-md flex items-center justify-center text-lg font-bold font-mono transition-all ${
              pin.length > idx ? color.digito : "border-slate-300 bg-slate-50 text-slate-300"
            }`}
          >
            {pin.length > idx ? "•" : ""}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-1.5 max-w-[200px] mx-auto mb-2">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9, "C", 0, "⌫"].map((keyVal) => (
          <button
            key={String(keyVal)}
            onClick={() => {
              props.onTecla();
              if (keyVal === "C") {
                setPin("");
              } else if (keyVal === "⌫") {
                setPin(pin.slice(0, -1));
              } else if (pin.length < 4) {
                setPin(pin + String(keyVal));
              }
            }}
            className="py-1.5 bg-slate-100 hover:bg-slate-200 rounded text-xs font-orbitron font-bold text-slate-800 transition-colors cursor-pointer border border-slate-200"
          >
            {keyVal}
          </button>
        ))}
      </div>

      <p className="text-[10px] text-slate-400 font-mono mb-2">El PIN se valida con la base de datos</p>

      <div className="flex gap-2 justify-center">
        <button
          onClick={props.onAtras}
          className="px-3 py-1 text-[11px] font-orbitron text-slate-600 hover:text-black cursor-pointer"
        >
          Atrás
        </button>
        <button
          disabled={cargando || pin.length !== 4}
          onClick={props.onConfirmar}
          className={`px-4 py-1.5 disabled:opacity-50 text-white font-orbitron font-bold text-xs rounded-lg transition-colors cursor-pointer shadow-xs ${color.boton}`}
        >
          {cargando ? props.textoCargando : props.textoBoton}
        </button>
      </div>
    </div>
  );
}

export default function PokemonBankApp() {
  const [activeScreen, setActiveScreen] = useState<ServiceType>("main");
  const [customAmount, setCustomAmount] = useState<string>("");
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: "success" | "error" | "info" } | null>(null);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [screenSize, setScreenSize] = useState<"normal" | "grande" | "max">("grande");
  const [showDbModal, setShowDbModal] = useState<boolean>(false);
  const [loadingAction, setLoadingAction] = useState<boolean>(false);

  // Comprobante
  const [activeReceipt, setActiveReceipt] = useState<TransaccionATM | null>(null);

  // Depósito con PIN
  const [depositStep, setDepositStep] = useState<"monto" | "otra" | "pin">("monto");
  const [depositAmount, setDepositAmount] = useState<number | null>(null);
  const [depositPin, setDepositPin] = useState<string>("");

  // Retiro con PIN
  const [withdrawPin, setWithdrawPin] = useState<string>("");
  const [withdrawAmount, setWithdrawAmount] = useState<number | null>(null);
  const [showPinPad, setShowPinPad] = useState<boolean>(false);
  const [retiroOtra, setRetiroOtra] = useState<boolean>(false);

  // Cuenta y estado de la db
  const [cuenta, setCuenta] = useState<CuentaPokemon>(CUENTA_VACIA);
  const [dbStatus, setDbStatus] = useState<"conectando" | "conectado" | "error">("conectando");

  // Campos del modal de la cuenta
  const [editNombre, setEditNombre] = useState("");
  const [editTipo, setEditTipo] = useState("");
  const [editSaldo, setEditSaldo] = useState("");
  const [editPin, setEditPin] = useState("");

  // Servicios
  const [servicios, setServicios] = useState<ServicioATM[]>([]);
  const [selectedServiceId, setSelectedServiceId] = useState<string | null>(null);
  const [montoServicio, setMontoServicio] = useState<string>("");

  // Transacciones
  const [transactions, setTransactions] = useState<TransaccionATM[]>([]);

  // Unión de la db con cuenta, transacciones y servicios
  const recargarCuenta = async () => {
    try {
      const res = await fetch("/api/cuenta");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setCuenta(data);
      setDbStatus("conectado");
    } catch (e) {
      console.warn("No se pudo cargar la cuenta:", e);
      setDbStatus("error");
    }
  };

  const recargarTransacciones = async () => {
    try {
      const res = await fetch("/api/atm/transacciones");
      const data = await res.json();
      if (res.ok && Array.isArray(data.transacciones)) {
        setTransactions(data.transacciones);
      }
    } catch (e) {
      console.warn("Error cargando transacciones:", e);
    }
  };

  const recargarServicios = async () => {
    try {
      const res = await fetch("/api/atm/servicios");
      const data = await res.json();
      if (res.ok && Array.isArray(data.servicios)) {
        setServicios(data.servicios);
        setSelectedServiceId((prev) => prev ?? data.servicios[0]?.id ?? null);
      }
    } catch (e) {
      console.warn("Error cargando servicios:", e);
    }
  };

  useEffect(() => {
    recargarCuenta();
    recargarTransacciones();
    recargarServicios();
  }, []);

  // Sonidos
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
      // El navegador puede bloquear el audio
    }
  };

  const showToast = (text: string, type: "success" | "error" | "info" = "info", duration = 3000) => {
    setStatusMessage({ text, type });
    setTimeout(() => setStatusMessage(null), duration);
  };

  // Depósito
  const reiniciarDeposito = () => {
    setDepositStep("monto");
    setDepositAmount(null);
    setDepositPin("");
    setCustomAmount("");
  };

  const pedirPinDeposito = (amount: number | null) => {
    if (!amount || !(amount > 0)) {
      playSound("error");
      showToast("Seleccione o digite la cantidad a depositar.", "error");
      return;
    }
    setDepositAmount(amount);
    setDepositPin("");
    setDepositStep("pin");
    playSound("beep");
  };

  const handleDeposit = async () => {
    const amount = depositAmount;
    if (!amount) return;
    if (depositPin.length !== 4) {
      playSound("error");
      showToast("Por favor ingrese el PIN de 4 dígitos", "error");
      return;
    }

    setLoadingAction(true);
    try {
      const res = await fetch("/api/atm/depositar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ monto: amount, pin: depositPin }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "No se pudo procesar el depósito");
      }

      playSound("success");
      setCuenta(data.cuenta);
      recargarTransacciones();
      setActiveReceipt(data.transaccion);
      showToast(`¡Depósito exitoso de $${amount.toLocaleString("es-MX", { minimumFractionDigits: 2 })}!`, "success", 3000);
      reiniciarDeposito();
    } catch (err: unknown) {
      playSound("error");
      setDepositPin("");
      const msg = err instanceof Error ? err.message : "Error al depositar";
      showToast(msg, "error");
    } finally {
      setLoadingAction(false);
    }
  };

  // Retiro
  const reiniciarRetiro = () => {
    setShowPinPad(false);
    setRetiroOtra(false);
    setWithdrawAmount(null);
    setWithdrawPin("");
    setCustomAmount("");
  };

  const iniciarRetiro = (amount: number | null) => {
    if (!amount || !(amount > 0)) {
      playSound("error");
      showToast("Seleccione o digite la cantidad a retirar.", "error");
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
      recargarTransacciones();
      setActiveReceipt(data.transaccion);
      showToast(`¡Retiro de $${withdrawAmount.toLocaleString("es-MX", { minimumFractionDigits: 2 })} exitoso! Tome su efectivo.`, "success", 3500);
      reiniciarRetiro();
    } catch (err: unknown) {
      playSound("error");
      setWithdrawPin("");
      const msg = err instanceof Error ? err.message : "Error al procesar el retiro";
      showToast(msg, "error");
    } finally {
      setLoadingAction(false);
    }
  };

  // Pago de servicios
  const handlePayService = async (serviceId: string, costo: number) => {
    const serv = servicios.find((s) => s.id === serviceId);
    if (!serv) return;

    if (!(costo > 0)) {
      playSound("error");
      showToast("Ingrese el monto a pagar del servicio.", "error");
      return;
    }
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
      recargarTransacciones();
      setActiveReceipt(data.transaccion);
      showToast(`¡Pago exitoso de ${serv.nombre} por $${costo.toLocaleString("es-MX", { minimumFractionDigits: 2 })}!`, "success", 3000);
      setMontoServicio("");
    } catch (err: unknown) {
      playSound("error");
      const msg = err instanceof Error ? err.message : "Error al procesar el pago";
      showToast(msg, "error");
    } finally {
      setLoadingAction(false);
    }
  };

  // Guardar cambios de la cuenta en la db
  const handleGuardarDatosDB = async () => {
    const pin = editPin.trim();
    if (pin && !/^\d{4}$/.test(pin)) {
      playSound("error");
      showToast("El PIN debe tener 4 dígitos.", "error");
      return;
    }

    const payload = {
      nombre: editNombre.trim(),
      tipoCuenta: editTipo.trim(),
      saldo: editSaldo.trim(),
      pin: pin || undefined,
    };

    try {
      const res = await fetch("/api/cuenta", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "No se pudieron guardar los cambios");
      }

      setCuenta(data.cuenta);
      recargarTransacciones();
      setShowDbModal(false);
      playSound("success");
      showToast("¡Datos de cuenta guardados en la base de datos!", "success");
    } catch (err: unknown) {
      playSound("error");
      const msg = err instanceof Error ? err.message : "Error al guardar en la base de datos";
      showToast(msg, "error");
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
      {/* Barra superior */}
      <div
        className="w-full flex items-center justify-between mb-1.5 px-2 text-xs text-slate-400 transition-all duration-300"
        style={{ maxWidth: getContainerStyle().maxWidth }}
      >
        <div className="flex items-center gap-2">
          <span
            className={`inline-block w-2.5 h-2.5 rounded-full animate-pulse ${
              dbStatus === "conectado" ? "bg-emerald-500" : dbStatus === "error" ? "bg-rose-500" : "bg-amber-400"
            }`}
          ></span>
          <span className="font-orbitron font-semibold tracking-wider text-slate-300">
            POKÉMON BANK ATM v3.0 • {dbStatus === "conectado" ? "EN LÍNEA" : dbStatus === "error" ? "SIN CONEXIÓN" : "CONECTANDO"}
          </span>
          <span
            className={`hidden sm:inline-flex items-center gap-1.5 text-[10px] font-mono px-2 py-0.5 rounded-full border ${
              dbStatus === "error"
                ? "text-rose-400 bg-rose-950/70 border-rose-700/60"
                : "text-emerald-400 bg-emerald-950/70 border-emerald-700/60"
            }`}
          >
            ● Supabase: {dbStatus === "error" ? "error de conexión" : dbStatus}
          </span>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Botón de tablas y db */}
          <button
            onClick={() => {
              playSound("beep");
              setEditNombre(cuenta.nombre);
              setEditTipo(cuenta.tipoCuenta);
              setEditSaldo(cuenta.saldo.toString());
              setEditPin("");
              setShowDbModal(true);
            }}
            className="flex items-center gap-1.5 bg-indigo-950/80 hover:bg-indigo-900 border border-indigo-700/60 text-indigo-300 hover:text-white px-2.5 py-1 rounded text-[10px] sm:text-xs font-orbitron font-semibold transition-all cursor-pointer shadow-xs"
            title="Configuración de campos y tablas de Base de Datos"
          >
            <span>🔌</span>
            <span>Tablas & BD</span>
          </button>

          {/* Tamaño de pantalla */}
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

      {/* Pokedex */}
      <div
        className="relative pokedex-glow transition-all duration-300 my-auto"
        style={getContainerStyle()}
      >
        {/* Pantalla */}
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
          {/* Notificación */}
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

          {/* Menú principal */}
          {activeScreen === "main" && (
            <div className="w-full h-full flex flex-col justify-between p-[3.5%] sm:p-[4%]">
              {/* Foto y datos de la cuenta */}
              <div className="flex items-center gap-[4%] w-full">
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

              <div className="w-full pt-[0.5%]">
                <h2 className="font-orbitron font-extrabold text-black text-[clamp(12px,1.75vw,25px)]">
                  ¿Que servicio necesitar realizar?
                </h2>
              </div>

              {/* Botones del menú */}
              <div className="grid grid-cols-2 gap-x-[3.8%] gap-y-[3.5%] w-full pb-[1%]">
                {/* Depositar */}
                <button
                  onClick={() => {
                    playSound("beep");
                    reiniciarDeposito();
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

                {/* Consultar saldo */}
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

                {/* Retirar */}
                <button
                  onClick={() => {
                    playSound("beep");
                    reiniciarRetiro();
                    setActiveScreen("retirar");
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

                {/* Pagar servicios */}
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

          {/* Pantalla de depósito */}
          {activeScreen === "depositar" && (
            <div className="w-full h-full flex flex-col p-[6%] bg-white text-black">
              {depositStep === "monto" && (
                <>
                  <h2 className="font-orbitron font-black text-[clamp(12px,1.6vw,22px)] mt-[2%] mb-[4%]">
                    ¿Que cantidad quiere depositar?
                  </h2>

                  <div className="grid grid-flow-col grid-rows-4 grid-cols-2 gap-x-[12%] gap-y-[4%] flex-1 max-h-[55%]">
                    {[5, 10, 20, 40, 60, 100, 200].map((amt) => (
                      <button
                        key={amt}
                        onClick={() => {
                          playSound("beep");
                          setDepositAmount(amt);
                        }}
                        className={`px-[4%] rounded-lg border border-[#548092] text-left font-orbitron font-black text-[clamp(10px,1.15vw,16px)] transition-colors cursor-pointer ${
                          depositAmount === amt ? "bg-[#9ec5f8]" : "bg-white hover:bg-slate-50"
                        }`}
                      >
                        ${amt.toFixed(2)}
                      </button>
                    ))}
                    <button
                      onClick={() => {
                        playSound("beep");
                        setDepositAmount(null);
                        setCustomAmount("");
                        setDepositStep("otra");
                      }}
                      className="px-[4%] rounded-lg border border-[#548092] bg-white hover:bg-slate-50 text-left font-orbitron font-black text-[clamp(10px,1.15vw,16px)] transition-colors cursor-pointer"
                    >
                      Otra cantidad
                    </button>
                  </div>

                  <div className="flex justify-center gap-[4%] mt-auto">
                    <button
                      onClick={() => {
                        playSound("beep");
                        reiniciarDeposito();
                        setActiveScreen("main");
                      }}
                      className="px-[5%] py-[1.2%] rounded-lg bg-white hover:bg-slate-50 border border-[#548092] font-orbitron font-black text-[clamp(10px,1.15vw,16px)] cursor-pointer transition-colors active:scale-95"
                    >
                      ← Menú principal
                    </button>
                    <button
                      onClick={() => pedirPinDeposito(depositAmount)}
                      className="flex items-center gap-2 px-[6%] py-[1.2%] rounded-lg bg-[#00d84a] hover:bg-[#00c043] border border-[#0a8a35] font-orbitron font-black text-[clamp(10px,1.15vw,16px)] cursor-pointer transition-colors active:scale-95"
                    >
                      <img src="/ICONOS%20POKEMON%20BANK/DepositNegro.png" alt="" className="h-[1.4em] w-auto" />
                      Depositar
                    </button>
                  </div>
                </>
              )}

              {depositStep === "otra" && (
                <>
                  <div className="my-auto">
                    <h2 className="font-orbitron font-black text-[clamp(12px,1.6vw,22px)] mb-[2%]">
                      Digite la cantidad a depositar
                    </h2>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="$0.00"
                      value={customAmount}
                      onChange={(e) => setCustomAmount(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") pedirPinDeposito(parseFloat(customAmount));
                      }}
                      autoFocus
                      className="w-[40%] px-[2%] py-[1%] rounded-lg border border-[#548092] font-orbitron font-black text-[clamp(10px,1.15vw,16px)] focus:outline-none focus:ring-2 focus:ring-[#9ec5f8]"
                    />
                  </div>

                  <div className="flex justify-center gap-[4%] mb-[2%]">
                    <button
                      onClick={() => {
                        playSound("beep");
                        setCustomAmount("");
                        setDepositStep("monto");
                      }}
                      className="px-[5%] py-[1.2%] rounded-lg bg-white hover:bg-slate-50 border border-[#548092] font-orbitron font-black text-[clamp(10px,1.15vw,16px)] cursor-pointer transition-colors active:scale-95"
                    >
                      ← Regresar
                    </button>
                    <button
                      onClick={() => pedirPinDeposito(parseFloat(customAmount))}
                      className="flex items-center gap-2 px-[6%] py-[1.2%] rounded-lg bg-[#00d84a] hover:bg-[#00c043] border border-[#0a8a35] font-orbitron font-black text-[clamp(10px,1.15vw,16px)] cursor-pointer transition-colors active:scale-95"
                    >
                      <img src="/ICONOS%20POKEMON%20BANK/DepositNegro.png" alt="" className="h-[1.4em] w-auto" />
                      Depositar
                    </button>
                  </div>
                </>
              )}

              {depositStep === "pin" && (
                <TecladoPin
                  pin={depositPin}
                  setPin={setDepositPin}
                  etiquetaMonto="Monto a depositar"
                  monto={depositAmount ?? 0}
                  textoBoton="Confirmar Depósito"
                  textoCargando="Depositando..."
                  cargando={loadingAction}
                  color="emerald"
                  onTecla={() => playSound("beep")}
                  onAtras={() => setDepositStep("monto")}
                  onConfirmar={handleDeposit}
                />
              )}
            </div>
          )}

          {/* Pantalla de consulta */}
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
                {/* Datos de la cuenta */}
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

                {/* Últimos movimientos */}
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
                    {transactions.length === 0 && (
                      <p className="text-[11px] text-slate-400 text-center py-3">Sin movimientos registrados</p>
                    )}
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
                          {tx.tipo === "DEPOSITO" ? "+" : "-"}${tx.monto.toLocaleString("es-MX", { minimumFractionDigits: 2 })}
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

          {/* Pantalla de retiro */}
          {activeScreen === "retirar" && (
            <div className="w-full h-full flex flex-col p-[6%] bg-white text-black">
              {!showPinPad && !retiroOtra && (
                <>
                  <h2 className="font-orbitron font-black text-[clamp(12px,1.6vw,22px)] mt-[2%] mb-[4%]">
                    ¿Que cantidad quiere retirar?
                  </h2>

                  <div className="grid grid-flow-col grid-rows-4 grid-cols-2 gap-x-[12%] gap-y-[4%] flex-1 max-h-[55%]">
                    {[5, 10, 20, 40, 60, 100, 200].map((amt) => (
                      <button
                        key={amt}
                        onClick={() => {
                          playSound("beep");
                          setWithdrawAmount(amt);
                        }}
                        className={`px-[4%] rounded-lg border border-[#548092] text-left font-orbitron font-black text-[clamp(10px,1.15vw,16px)] transition-colors cursor-pointer ${
                          withdrawAmount === amt ? "bg-[#9ec5f8]" : "bg-white hover:bg-slate-50"
                        }`}
                      >
                        ${amt.toFixed(2)}
                      </button>
                    ))}
                    <button
                      onClick={() => {
                        playSound("beep");
                        setWithdrawAmount(null);
                        setCustomAmount("");
                        setRetiroOtra(true);
                      }}
                      className="px-[4%] rounded-lg border border-[#548092] bg-white hover:bg-slate-50 text-left font-orbitron font-black text-[clamp(10px,1.15vw,16px)] transition-colors cursor-pointer"
                    >
                      Otra cantidad
                    </button>
                  </div>

                  <div className="flex justify-center mt-auto">
                    <button
                      onClick={() => iniciarRetiro(withdrawAmount)}
                      className="flex items-center gap-2 px-[6%] py-[1.2%] rounded-lg bg-[#00d84a] hover:bg-[#00c043] border border-[#0a8a35] font-orbitron font-black text-[clamp(10px,1.15vw,16px)] cursor-pointer transition-colors active:scale-95"
                    >
                      <img src="/ICONOS%20POKEMON%20BANK/RetirarDineroNegro.png" alt="" className="h-[1.4em] w-auto" />
                      Retirar
                    </button>
                  </div>
                </>
              )}

              {!showPinPad && retiroOtra && (
                <>
                  <div className="my-auto">
                    <h2 className="font-orbitron font-black text-[clamp(12px,1.6vw,22px)] mb-[2%]">
                      Digite la cantidad a retirar
                    </h2>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="$0.00"
                      value={customAmount}
                      onChange={(e) => setCustomAmount(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") iniciarRetiro(parseFloat(customAmount));
                      }}
                      autoFocus
                      className="w-[40%] px-[2%] py-[1%] rounded-lg border border-[#548092] font-orbitron font-black text-[clamp(10px,1.15vw,16px)] focus:outline-none focus:ring-2 focus:ring-[#9ec5f8]"
                    />
                  </div>

                  <div className="flex justify-center gap-[4%] mb-[2%]">
                    <button
                      onClick={() => {
                        playSound("beep");
                        setCustomAmount("");
                        setRetiroOtra(false);
                      }}
                      className="px-[5%] py-[1.2%] rounded-lg bg-white hover:bg-slate-50 border border-[#548092] font-orbitron font-black text-[clamp(10px,1.15vw,16px)] cursor-pointer transition-colors active:scale-95"
                    >
                      ← Regresar
                    </button>
                    <button
                      onClick={() => iniciarRetiro(parseFloat(customAmount))}
                      className="flex items-center gap-2 px-[6%] py-[1.2%] rounded-lg bg-[#00d84a] hover:bg-[#00c043] border border-[#0a8a35] font-orbitron font-black text-[clamp(10px,1.15vw,16px)] cursor-pointer transition-colors active:scale-95"
                    >
                      <img src="/ICONOS%20POKEMON%20BANK/RetirarDineroNegro.png" alt="" className="h-[1.4em] w-auto" />
                      Retirar
                    </button>
                  </div>
                </>
              )}

              {showPinPad && (
                <TecladoPin
                  pin={withdrawPin}
                  setPin={setWithdrawPin}
                  etiquetaMonto="Monto a retirar"
                  monto={withdrawAmount ?? 0}
                  textoBoton="Confirmar Retiro"
                  textoCargando="Dispensando..."
                  cargando={loadingAction}
                  color="amber"
                  onTecla={() => playSound("beep")}
                  onAtras={() => {
                    setShowPinPad(false);
                    setRetiroOtra(false);
                  }}
                  onConfirmar={confirmarRetiroConPin}
                />
              )}
            </div>
          )}

          {/* Pantalla de pago de servicios */}
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

              <div className="my-auto py-1">
                {servicios.length === 0 ? (
                  <p className="text-center text-xs text-slate-500 font-orbitron">Cargando servicios...</p>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    {servicios.map((serv) => (
                      <div
                        key={serv.id}
                        className={`p-2.5 rounded-xl border transition-all cursor-pointer bg-white flex items-center gap-2 ${
                          selectedServiceId === serv.id
                            ? "border-indigo-600 ring-2 ring-indigo-200"
                            : "border-slate-200 hover:border-slate-300"
                        }`}
                        onClick={() => {
                          playSound("beep");
                          setSelectedServiceId(serv.id);
                        }}
                      >
                        <span className="text-xl">{serv.icono}</span>
                        <div className="min-w-0">
                          <p className="font-semibold text-xs text-slate-800 leading-tight">{serv.nombre}</p>
                          <p className="text-[10px] text-slate-500">{serv.institucion}</p>
                          <p className="text-[10px] font-mono text-indigo-700 mt-0.5 truncate">NPE {serv.npe}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex items-center justify-center gap-2 max-w-sm mx-auto mt-3">
                  <input
                    type="number"
                    placeholder="Monto a pagar"
                    value={montoServicio}
                    onChange={(e) => setMontoServicio(e.target.value)}
                    disabled={loadingAction}
                    className="w-44 px-3 py-1.5 text-xs sm:text-sm border border-slate-300 rounded-lg font-orbitron focus:outline-none focus:border-indigo-600 bg-white"
                  />
                  <button
                    disabled={loadingAction || !selectedServiceId}
                    onClick={() => {
                      if (selectedServiceId) handlePayService(selectedServiceId, parseFloat(montoServicio));
                    }}
                    className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg font-orbitron font-bold text-xs transition-colors cursor-pointer shadow-xs active:scale-95"
                  >
                    {loadingAction ? "..." : "Pagar"}
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
                <span className="text-[10px] text-slate-400 font-mono">
                  Pagos procesados vía Silph Co. Network
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Marco de la pokedex */}
        <img
          src="/assets/POKEDEX.png"
          alt="Pokedex Frame"
          className="absolute inset-0 w-full h-full object-fill pointer-events-none select-none z-20"
          draggable={false}
        />

        {/* Logo */}
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

      {/* Comprobante */}
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
                <span className="font-bold text-black">{ETIQUETA_TIPO[activeReceipt.tipo]}</span>
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

      {/* Modal de la db */}
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
                <span>Supabase: {dbStatus}</span>
              </div>
              <p className="text-[11px] text-slate-300">
                Cuenta del cajero: <code className="text-emerald-300">cuentas.id_cuenta = {cuenta.numeroCuenta}</code>
              </p>
              <p className="text-[10px] text-slate-400 mt-1">
                Script SQL con todas las tablas guardado en: <code className="text-amber-300">supabase_pokemon_bank.sql</code>
              </p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-[11px] font-orbitron font-semibold text-slate-300 mb-1">
                  Nombre del Titular (nombre_titular):
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
                    Tipo de Cuenta (tipo_cuenta):
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
                    Nuevo PIN (pin):
                  </label>
                  <input
                    type="password"
                    inputMode="numeric"
                    maxLength={4}
                    placeholder="Vacío = no cambiar"
                    value={editPin}
                    onChange={(e) => setEditPin(e.target.value)}
                    className="w-full px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs font-mono text-amber-300 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-orbitron font-semibold text-slate-300 mb-1">
                  Número de Cuenta (id_cuenta):
                </label>
                <input
                  type="text"
                  value={cuenta.numeroCuenta}
                  readOnly
                  className="w-full px-3 py-1.5 bg-slate-800/50 border border-slate-700 rounded-lg text-xs font-mono text-slate-400 cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-[11px] font-orbitron font-semibold text-slate-300 mb-1">
                  Saldo en Cuenta (saldo_disponible):
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
                <span className="bg-slate-800/80 px-2 py-1 rounded text-sky-300">✓ cuentas</span>
                <span className="bg-slate-800/80 px-2 py-1 rounded text-sky-300">✓ transacciones</span>
                <span className="bg-slate-800/80 px-2 py-1 rounded text-sky-300">✓ servicios</span>
                <span className="bg-slate-800/80 px-2 py-1 rounded text-sky-300">✓ auditoria_accesos</span>
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

      {/* Pie de página */}
      <footer className="mt-3 text-center text-xs text-slate-500 font-sans">
        Pokémon Bank Terminal Interface • ATM 100% Funcional con Depósitos, Retiros, Consultas y Pagos
      </footer>
    </main>
  );
}
