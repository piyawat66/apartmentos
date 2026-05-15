-- ============================================================
--  ApartmentOS v1.0  —  Initial Users Seed
--
--  Run in Supabase SQL Editor AFTER 001_schema.sql
--  Replace emails/passwords before running in production!
-- ============================================================

-- Create users via Supabase Auth Admin API (SQL approach)
-- NOTE: Supabase does not allow direct INSERT into auth.users via SQL Editor
-- on hosted plans. Use one of these methods instead:
--
--  OPTION A (Recommended for setup):
--    Dashboard → Authentication → Users → "Add user"
--    Then run the UPDATE below to set roles.
--
--  OPTION B (CLI / service_role):
--    Use the Supabase Management API or Auth Admin SDK with service_role key.
--
-- After creating users in the dashboard, set their roles:
-- ============================================================

-- Example: set role for a specific user after creating them in dashboard
-- UPDATE public.profiles SET role = 'admin',   full_name = 'ผู้ดูแลระบบ'  WHERE id = '<user-uuid>';
-- UPDATE public.profiles SET role = 'manager', full_name = 'ผู้จัดการ'     WHERE id = '<user-uuid>';
-- UPDATE public.profiles SET role = 'staff',   full_name = 'พนักงาน'        WHERE id = '<user-uuid>';

-- List all profiles to verify
-- SELECT id, full_name, role FROM public.profiles;
