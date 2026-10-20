-- =========================================================================
-- 🏦 POKÉMON BANK - ESQUEMA DE BASE DE DATOS PARA CAJERO AUTOMÁTICO (ATM)
-- Proyecto Supabase: vknqulxhybbjaqhdttie
-- Compatible con PostgreSQL y Supabase SQL Editor
-- =========================================================================

-- 1. TABLA DE CUENTAS
CREATE TABLE IF NOT EXISTS public.cuentas (
    id_cuenta VARCHAR(20) PRIMARY KEY,
    nombre_titular VARCHAR(100) NOT NULL,
    tipo_cuenta VARCHAR(50) NOT NULL DEFAULT 'Cuenta de Ahorro',
    pin VARCHAR(4) NOT NULL,
    saldo_disponible NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    estado_cuenta VARCHAR(20) NOT NULL DEFAULT 'Activa',
    fecha_creacion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 2. TABLA DE TRANSACCIONES (monto positivo = ingreso, negativo = egreso)
CREATE TABLE IF NOT EXISTS public.transacciones (
    id_transaccion SERIAL PRIMARY KEY,
    id_cuenta VARCHAR(20) NOT NULL,
    tipo_transaccion VARCHAR(30) NOT NULL,
    descripcion VARCHAR(150) NOT NULL,
    monto NUMERIC(10, 2) NOT NULL,
    fecha_hora TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_transacciones_cuentas FOREIGN KEY (id_cuenta)
        REFERENCES public.cuentas(id_cuenta) ON DELETE CASCADE
);

-- 3. TABLA DE SERVICIOS PARA PAGO
CREATE TABLE IF NOT EXISTS public.servicios (
    id_servicio SERIAL PRIMARY KEY,
    nombre_servicio VARCHAR(50) NOT NULL,
    institucion VARCHAR(80) NOT NULL,
    npe VARCHAR(30) NOT NULL UNIQUE
);

-- 4. TABLA DE AUDITORÍA DE ACCESOS (intentos de PIN)
CREATE TABLE IF NOT EXISTS public.auditoria_accesos (
    id_auditoria SERIAL PRIMARY KEY,
    id_cuenta VARCHAR(20) NOT NULL,
    pin_ingresado VARCHAR(4) NOT NULL,
    resultado VARCHAR(50) NOT NULL,
    fecha_hora TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_auditoria_cuentas FOREIGN KEY (id_cuenta)
        REFERENCES public.cuentas(id_cuenta)
);

-- =========================================================================
-- 📊 VISTA DE ESTADÍSTICAS
-- =========================================================================
CREATE OR REPLACE VIEW public.vw_estadisticastransacciones AS
SELECT
    id_transaccion,
    id_cuenta,
    tipo_transaccion,
    descripcion,
    monto,
    CASE WHEN monto >= 0 THEN 'Ingreso' ELSE 'Egreso' END AS clasificacion,
    to_char(fecha_hora, 'DD/MM/YY | HH24:MI') AS fecha_formateada
FROM public.transacciones t;

-- =========================================================================
-- ⚙️ PROCEDIMIENTOS ALMACENADOS
-- =========================================================================

-- Registra la transacción y actualiza el saldo de la cuenta
CREATE OR REPLACE FUNCTION public.sp_procesartransaccion(
    p_id_cuenta VARCHAR,
    p_tipo_transaccion VARCHAR,
    p_descripcion VARCHAR,
    p_monto NUMERIC
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
    INSERT INTO transacciones (id_cuenta, tipo_transaccion, descripcion, monto)
    VALUES (p_id_cuenta, p_tipo_transaccion, p_descripcion, p_monto);

    UPDATE cuentas
    SET saldo_disponible = saldo_disponible + p_monto
    WHERE cuentas.id_cuenta = p_id_cuenta;
END;
$$;

-- Valida el PIN y guarda el intento en auditoria_accesos
CREATE OR REPLACE FUNCTION public.sp_validarpin(
    p_id_cuenta VARCHAR,
    p_pin VARCHAR
)
RETURNS TABLE(estado TEXT, id_cuenta VARCHAR, nombre_titular VARCHAR, saldo_disponible NUMERIC, mensaje TEXT)
LANGUAGE plpgsql
AS $$
BEGIN
    IF EXISTS (SELECT 1 FROM cuentas c WHERE c.id_cuenta = p_id_cuenta AND c.pin = p_pin) THEN
        INSERT INTO auditoria_accesos (id_cuenta, pin_ingresado, resultado)
        VALUES (p_id_cuenta, p_pin, 'Acceso Concedido');

        RETURN QUERY
        SELECT 'Exito'::TEXT, c.id_cuenta, c.nombre_titular, c.saldo_disponible, 'Acceso Concedido'::TEXT
        FROM cuentas c WHERE c.id_cuenta = p_id_cuenta;
    ELSE
        INSERT INTO auditoria_accesos (id_cuenta, pin_ingresado, resultado)
        VALUES (p_id_cuenta, p_pin, 'PIN Incorrecto');

        RETURN QUERY
        SELECT 'Error'::TEXT, NULL::VARCHAR(20), NULL::VARCHAR(100), NULL::DECIMAL(12,2), 'PIN de 4 dígitos incorrecto.'::TEXT;
    END IF;
END;
$$;

-- =========================================================================
-- 🌟 DATOS INICIALES (SEED DATA)
-- =========================================================================

-- Cuenta del cajero (PIN de ejemplo)
INSERT INTO public.cuentas (id_cuenta, nombre_titular, tipo_cuenta, pin, saldo_disponible, estado_cuenta)
VALUES ('34526685463256668', 'JONATAN ALEXANDER ORELLANA HERNANDEZ', 'Cuenta de Ahorro', '1234', 0.00, 'Activa')
ON CONFLICT (id_cuenta) DO NOTHING;

-- Catálogo de servicios
INSERT INTO public.servicios (nombre_servicio, institucion, npe)
VALUES
    ('Energía Eléctrica', 'Centro Pokémon', '324235346564532423'),
    ('Internet', 'Tigo El Salvador', '112233445566778899'),
    ('Telefonía', 'Claro', '998877665544332211'),
    ('Agua Potable', 'ANDA', '556677889900112233')
ON CONFLICT (npe) DO NOTHING;

-- Movimientos iniciales (pasan por el procedimiento para que el saldo cuadre)
-- SELECT sp_procesartransaccion('34526685463256668', 'Depósito', 'Ingreso de Trabajo', 300.12);
-- SELECT sp_procesartransaccion('34526685463256668', 'Pago de Servicios', 'Pago de Gasolina', -100.50);
