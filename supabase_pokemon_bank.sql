-- =========================================================================
-- 🏦 POKÉMON BANK - ESQUEMA DE BASE DE DATOS PARA CAJERO AUTOMÁTICO (ATM)
-- Proyecto Supabase: vknqulxhybbjaqhdttie
-- Compatible con PostgreSQL y Supabase SQL Editor
-- =========================================================================

-- 1. TABLA DE CUENTAS BANCARIAS POKÉMON
CREATE TABLE IF NOT EXISTS public.pokemon_bank_cuentas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id_usuario BIGINT REFERENCES public."User"("ID_User") ON DELETE SET NULL,
    numero_cuenta VARCHAR(30) UNIQUE NOT NULL,
    tipo_cuenta VARCHAR(50) NOT NULL DEFAULT 'CUENTA DE AHORRO',
    nombre_titular VARCHAR(150) NOT NULL,
    saldo NUMERIC(14, 2) NOT NULL DEFAULT 1450250.00 CHECK (saldo >= 0),
    pin_cajero VARCHAR(4) NOT NULL DEFAULT '1234',
    estado VARCHAR(20) NOT NULL DEFAULT 'ACTIVA' CHECK (estado IN ('ACTIVA', 'BLOQUEADA', 'SUSPENDIDA')),
    foto_perfil TEXT NOT NULL DEFAULT '/ICONOS%20POKEMON%20BANK/CHARIZARD.png',
    nivel_entrenador VARCHAR(60) NOT NULL DEFAULT 'Nivel Maestro Pokémon ★★★',
    limite_retiro_diario NUMERIC(12, 2) NOT NULL DEFAULT 20000.00,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. TABLA DE CATÁLOGO DE SERVICIOS
CREATE TABLE IF NOT EXISTS public.pokemon_bank_servicios (
    id VARCHAR(50) PRIMARY KEY,
    nombre VARCHAR(120) NOT NULL,
    categoria VARCHAR(60) NOT NULL,
    tarifa_base NUMERIC(10, 2) NOT NULL,
    icono VARCHAR(20) NOT NULL DEFAULT '⚡',
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. TABLA DE TRANSACCIONES Y AUDITORÍA DEL CAJERO (ATM)
CREATE TABLE IF NOT EXISTS public.pokemon_bank_transacciones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    numero_cuenta VARCHAR(30) NOT NULL REFERENCES public.pokemon_bank_cuentas(numero_cuenta) ON DELETE CASCADE,
    tipo_transaccion VARCHAR(30) NOT NULL CHECK (tipo_transaccion IN ('DEPOSITO', 'RETIRO', 'PAGO_SERVICIO', 'CONSULTA')),
    monto NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    saldo_anterior NUMERIC(14, 2) NOT NULL,
    saldo_posterior NUMERIC(14, 2) NOT NULL,
    descripcion TEXT NOT NULL,
    referencia VARCHAR(50) UNIQUE NOT NULL,
    estado VARCHAR(20) NOT NULL DEFAULT 'EXITOSA' CHECK (estado IN ('EXITOSA', 'RECHAZADA', 'FALLIDA')),
    cajero_id VARCHAR(30) DEFAULT 'ATM-POKEDEX-01',
    fecha TIMESTAMPTZ DEFAULT NOW()
);

-- 4. TABLA DE PAGOS DE SERVICIOS
CREATE TABLE IF NOT EXISTS public.pokemon_bank_pagos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    numero_cuenta VARCHAR(30) NOT NULL REFERENCES public.pokemon_bank_cuentas(numero_cuenta) ON DELETE CASCADE,
    servicio_id VARCHAR(50) NOT NULL REFERENCES public.pokemon_bank_servicios(id),
    monto NUMERIC(10, 2) NOT NULL,
    numero_factura VARCHAR(60) NOT NULL,
    codigo_autorizacion VARCHAR(60) NOT NULL,
    fecha_pago TIMESTAMPTZ DEFAULT NOW()
);

-- =========================================================================
-- 🌟 DATOS INICIALES (SEED DATA)
-- =========================================================================

-- Insertar o actualizar la cuenta de Jonatan vinculada a ID_User: 60
INSERT INTO public.pokemon_bank_cuentas (
    id_usuario,
    numero_cuenta,
    tipo_cuenta,
    nombre_titular,
    saldo,
    pin_cajero,
    estado,
    foto_perfil,
    nivel_entrenador,
    limite_retiro_diario
) VALUES (
    60,
    '34526685463256668',
    'CUENTA DE AHORRO',
    'JONATAN ALEXANDER ORELLANA HERNANDEZ',
    1450250.00,
    '1234',
    'ACTIVA',
    '/ICONOS%20POKEMON%20BANK/CHARIZARD.png',
    'Nivel Maestro Pokémon ★★★',
    25000.00
) ON CONFLICT (numero_cuenta) DO UPDATE SET
    nombre_titular = EXCLUDED.nombre_titular,
    saldo = EXCLUDED.saldo,
    id_usuario = EXCLUDED.id_usuario;

-- Insertar catálogo de servicios disponibles para pago
INSERT INTO public.pokemon_bank_servicios (id, nombre, categoria, tarifa_base, icono)
VALUES 
    ('silph_co', 'Silph Co. Energía Eléctrica', 'Electricidad', 850.00, '⚡'),
    ('gym_celeste', 'Gym Celeste - Acueductos y Agua', 'Agua', 420.00, '💧'),
    ('poke_net', 'Poké-Net 5G Banda Ancha & Datos', 'Telecomunicaciones', 650.00, '📶'),
    ('centro_pokemon', 'Centro Pokémon - Cobertura Médica', 'Salud', 1200.00, '🏥')
ON CONFLICT (id) DO UPDATE SET
    nombre = EXCLUDED.nombre,
    tarifa_base = EXCLUDED.tarifa_base;

-- Insertar transacciones iniciales para historial del ATM
INSERT INTO public.pokemon_bank_transacciones (
    numero_cuenta,
    tipo_transaccion,
    monto,
    saldo_anterior,
    saldo_posterior,
    descripcion,
    referencia
) VALUES
    ('34526685463256668', 'DEPOSITO', 50000.00, 1400250.00, 1450250.00, 'Recompensa Campeón Liga Pokémon', 'TX-PKMN-901'),
    ('34526685463256668', 'RETIRO', 6000.00, 1456250.00, 1450250.00, 'Compra Poké Mart (Ultra Balls x50)', 'TX-PKMN-902'),
    ('34526685463256668', 'PAGO_SERVICIO', 1500.00, 1451750.00, 1450250.00, 'Suscripción Silph Co. Cloud', 'TX-PKMN-903'),
    ('34526685463256668', 'DEPOSITO', 12000.00, 1438250.00, 1450250.00, 'Premio Victoria Gimnasio Celeste', 'TX-PKMN-904')
ON CONFLICT (referencia) DO NOTHING;

-- Crear índices para búsquedas rápidas en el cajero
CREATE INDEX IF NOT EXISTS idx_pokemon_bank_cuentas_numero ON public.pokemon_bank_cuentas(numero_cuenta);
CREATE INDEX IF NOT EXISTS idx_pokemon_bank_transacciones_cuenta ON public.pokemon_bank_transacciones(numero_cuenta, fecha DESC);

