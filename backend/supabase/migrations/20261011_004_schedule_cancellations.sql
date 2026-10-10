-- ============================================================================
-- GRAND AZURE LUXURY HOTEL SYSTEM — MIGRATION 004
-- Migration: Native pg_cron Scheduled Job for 24-Hour Policy Cancellations
-- ============================================================================
-- Purpose:
-- Offloads the 24-hour unpaid booking cancellation policy check from the
-- Node.js Express server loop directly into PostgreSQL's native scheduler (pg_cron).
-- Runs every hour at minute 0, auto-releasing locked room dates when guests with
-- PAY_AT_HOTEL reservations do not confirm within the 24-hour window.
-- ============================================================================

-- 1. Enable PostgreSQL Native Scheduler Extension
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- 2. Grant permissions to postgres administrative role
GRANT USAGE ON SCHEMA cron TO postgres;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA cron TO postgres;

-- 3. Idempotently remove existing job if already registered
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_extension WHERE extname = 'pg_cron'
    ) THEN
        PERFORM cron.unschedule('hourly-24h-unpaid-cancellation-check')
        FROM cron.job
        WHERE jobname = 'hourly-24h-unpaid-cancellation-check';
    END IF;
EXCEPTION WHEN OTHERS THEN
    -- If cron tables or jobs do not exist yet, continue safely
    NULL;
END $$;

-- 4. Register Hourly Cron Job
-- Runs auto_cancel_unpaid_bookings() procedure directly inside the database
SELECT cron.schedule(
    'hourly-24h-unpaid-cancellation-check',
    '0 * * * *', -- Every hour at minute 0 (00:00, 01:00, 02:00, ...)
    $$SELECT public.auto_cancel_unpaid_bookings();$$
);

-- 5. Audit Log Registration for Schema Versioning
INSERT INTO public.audit_logs (
    actor_role,
    action,
    entity_type,
    details
) VALUES (
    'SYSTEM_MIGRATION',
    'PG_CRON_SCHEDULE_ACTIVATED',
    'system_jobs',
    jsonb_build_object(
        'job_name', 'hourly-24h-unpaid-cancellation-check',
        'cron_expression', '0 * * * *',
        'procedure', 'public.auto_cancel_unpaid_bookings()',
        'activated_at', NOW()
    )
);
