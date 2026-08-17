-- ============================================================
-- AZ MONOPRIX — Explicit privileges for anon / authenticated
-- ============================================================
-- Supabase RLS + GRANT model: RLS filters rows, but the role must
-- also hold table-level privileges. We grant them explicitly so
-- policies are the only thing gating access.

grant usage on schema public to anon, authenticated, service_role;

grant select on all tables in schema public to anon;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant all on all tables in schema public to service_role;

grant usage, select on all sequences in schema public to anon, authenticated;
grant all on all sequences in schema public to service_role;

grant execute on all functions in schema public to anon, authenticated;
grant execute on all functions in schema public to service_role;

alter default privileges in schema public
  grant select on tables to anon;
alter default privileges in schema public
  grant select, insert, update, delete on tables to authenticated;
alter default privileges in schema public
  grant all on tables to service_role;
