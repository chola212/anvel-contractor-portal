-- ANVEL Contractor Portal
-- Phase 10: prevent duplicate payment statements for one timesheet.
--
-- Apply only to the development/staging Supabase project first.

create unique index if not exists payment_statements_timesheet_id_unique
on public.payment_statements(timesheet_id);
