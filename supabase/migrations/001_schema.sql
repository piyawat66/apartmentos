-- ============================================================
--  ApartmentOS v1.0  —  Full Schema
--  Run this once in Supabase SQL Editor
-- ============================================================

-- ── Profiles (extends auth.users) ────────────────────────────
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  full_name   text,
  role        text not null default 'staff'
                   check (role in ('admin','manager','staff','housekeeper')),
  created_at  timestamptz default now()
);

-- Auto-create profile when a user signs up
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.email),
    coalesce(new.raw_user_meta_data->>'role', 'staff')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ── Properties ───────────────────────────────────────────────
create table if not exists public.properties (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  address     text,
  phone       text,
  settings    jsonb default '{}',
  is_active   boolean default true,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

-- ── User ↔ Property mapping ──────────────────────────────────
create table if not exists public.user_properties (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid references auth.users(id) on delete cascade,
  property_id  uuid references public.properties(id) on delete cascade,
  role         text default 'staff',
  unique(user_id, property_id)
);

-- ── Floors ───────────────────────────────────────────────────
create table if not exists public.floors (
  id            uuid primary key default gen_random_uuid(),
  property_id   uuid references public.properties(id) on delete cascade,
  name          text not null,
  floor_number  integer not null,
  description   text,
  created_at    timestamptz default now()
);

-- ── Rooms ────────────────────────────────────────────────────
create table if not exists public.rooms (
  id              uuid primary key default gen_random_uuid(),
  floor_id        uuid references public.floors(id) on delete cascade,
  property_id     uuid references public.properties(id) on delete cascade,
  room_number     text not null,
  room_type       text default 'standard',
  status          text default 'available',
  base_price      numeric default 0,
  max_occupancy   integer default 2,
  amenities       jsonb default '[]',
  notes           text,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

-- ── Guests ───────────────────────────────────────────────────
create table if not exists public.guests (
  id                          uuid primary key default gen_random_uuid(),
  property_id                 uuid references public.properties(id) on delete cascade,
  full_name                   text not null,
  phone                       text,
  id_card                     text,
  occupation                  text,
  num_occupants               integer default 1,
  emergency_contact_name      text,
  emergency_contact_phone     text,
  emergency_contact_relation  text,
  photo_url                   text,
  id_card_url                 text,
  notes                       text,
  is_blacklisted              boolean default false,
  created_at                  timestamptz default now()
);

-- ── Contracts ────────────────────────────────────────────────
create table if not exists public.contracts (
  id                      uuid primary key default gen_random_uuid(),
  property_id             uuid references public.properties(id) on delete cascade,
  room_id                 uuid references public.rooms(id),
  guest_id                uuid references public.guests(id),
  status                  text default 'active',
  start_date              date not null,
  end_date                date,
  monthly_rent            numeric default 0,
  deposit_amount          numeric default 0,
  deposit_paid            boolean default false,
  deposit_receipt_images  jsonb default '[]',
  water_rate              numeric default 18,
  electric_rate           numeric default 5,
  notes                   text,
  created_by              uuid references auth.users(id),
  created_at              timestamptz default now(),
  updated_at              timestamptz default now()
);

-- ── Monthly Invoices ─────────────────────────────────────────
create table if not exists public.monthly_invoices (
  id               uuid primary key default gen_random_uuid(),
  property_id      uuid references public.properties(id) on delete cascade,
  contract_id      uuid references public.contracts(id) on delete cascade,
  room_id          uuid references public.rooms(id),
  guest_id         uuid references public.guests(id),
  year             integer not null,
  month            integer not null,
  due_date         date,
  rent_amount      numeric default 0,
  water_units      numeric default 0,
  water_amount     numeric default 0,
  electric_units   numeric default 0,
  electric_amount  numeric default 0,
  other_amount     numeric default 0,
  other_label      text default '',
  total_amount     numeric default 0,
  status           text default 'pending',
  paid_at          timestamptz,
  paid_amount      numeric default 0,
  payment_method   text default '',
  slip_url         text,
  note             text default '',
  created_at       timestamptz default now(),
  updated_at       timestamptz default now(),
  unique(contract_id, year, month)
);

-- ── Meter Readings ───────────────────────────────────────────
create table if not exists public.meter_readings (
  id             uuid primary key default gen_random_uuid(),
  property_id    uuid references public.properties(id) on delete cascade,
  contract_id    uuid references public.contracts(id) on delete cascade,
  room_id        uuid references public.rooms(id),
  year           integer not null,
  month          integer not null,
  water_prev     numeric default 0,
  water_curr     numeric default 0,
  electric_prev  numeric default 0,
  electric_curr  numeric default 0,
  read_at        timestamptz default now(),
  created_at     timestamptz default now(),
  unique(contract_id, year, month)
);

-- ── Bookings (nightly) ───────────────────────────────────────
create table if not exists public.bookings (
  id               uuid primary key default gen_random_uuid(),
  property_id      uuid references public.properties(id) on delete cascade,
  room_id          uuid references public.rooms(id),
  guest_id         uuid references public.guests(id),
  booking_type     text default 'nightly',
  check_in_date    date not null,
  check_out_date   date,
  actual_check_in  timestamptz,
  actual_check_out timestamptz,
  status           text default 'reserved',
  total_amount     numeric default 0,
  deposit_amount   numeric default 0,
  notes            text,
  created_by       uuid references auth.users(id),
  created_at       timestamptz default now(),
  updated_at       timestamptz default now()
);

-- ── Payments ─────────────────────────────────────────────────
create table if not exists public.payments (
  id              uuid primary key default gen_random_uuid(),
  booking_id      uuid references public.bookings(id) on delete set null,
  invoice_id      uuid references public.monthly_invoices(id) on delete set null,
  property_id     uuid references public.properties(id),
  amount          numeric not null,
  payment_method  text default 'cash',
  payment_type    text default 'rent',
  slip_url        text,
  paid_at         timestamptz default now(),
  note            text,
  created_by      uuid references auth.users(id),
  created_at      timestamptz default now()
);

-- ── Expenses ─────────────────────────────────────────────────
create table if not exists public.expenses (
  id          uuid primary key default gen_random_uuid(),
  property_id uuid references public.properties(id) on delete cascade,
  title       text not null,
  amount      numeric not null,
  category    text default 'other',
  paid_at     timestamptz default now(),
  note        text,
  image_url   text,
  created_by  uuid references auth.users(id),
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

-- ── Housekeeping Logs ────────────────────────────────────────
create table if not exists public.housekeeping_logs (
  id           uuid primary key default gen_random_uuid(),
  room_id      uuid references public.rooms(id) on delete cascade,
  assigned_to  uuid references auth.users(id),
  status       text default 'pending',
  notes        text,
  completed_at timestamptz,
  created_at   timestamptz default now()
);

-- ── Maintenance Requests ─────────────────────────────────────
create table if not exists public.maintenance_requests (
  id           uuid primary key default gen_random_uuid(),
  room_id      uuid references public.rooms(id) on delete cascade,
  property_id  uuid references public.properties(id),
  title        text not null,
  description  text,
  priority     text default 'medium',
  status       text default 'open',
  resolved_at  timestamptz,
  cost         numeric,
  created_at   timestamptz default now(),
  updated_at   timestamptz default now()
);

-- ============================================================
--  Row Level Security
-- ============================================================

alter table public.profiles           enable row level security;
alter table public.properties         enable row level security;
alter table public.user_properties    enable row level security;
alter table public.floors             enable row level security;
alter table public.rooms              enable row level security;
alter table public.guests             enable row level security;
alter table public.contracts          enable row level security;
alter table public.monthly_invoices   enable row level security;
alter table public.meter_readings     enable row level security;
alter table public.bookings           enable row level security;
alter table public.payments           enable row level security;
alter table public.expenses           enable row level security;
alter table public.housekeeping_logs  enable row level security;
alter table public.maintenance_requests enable row level security;

-- Helper: returns true if the current user can access a property
create or replace function public.can_access_property(pid uuid)
returns boolean language sql security definer stable as $$
  select
    exists (select 1 from public.user_properties where user_id = auth.uid() and property_id = pid)
    or
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
$$;

-- Profiles
create policy "profiles_read"        on public.profiles for select to authenticated using (true);
create policy "profiles_update_own"  on public.profiles for update to authenticated using (id = auth.uid());

-- Properties
create policy "properties_all" on public.properties for all to authenticated
  using (can_access_property(id)) with check (can_access_property(id));

-- user_properties
create policy "up_read"   on public.user_properties for select to authenticated using (true);
create policy "up_manage" on public.user_properties for all to authenticated
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

-- Tables with property_id
do $$ declare t text; begin
  foreach t in array array[
    'floors','rooms','guests','contracts','monthly_invoices',
    'meter_readings','bookings','payments','expenses',
    'maintenance_requests'
  ] loop
    execute format(
      'create policy "%s_all" on public.%I for all to authenticated
       using (can_access_property(property_id))
       with check (can_access_property(property_id))',
      t, t
    );
  end loop;
end $$;

-- housekeeping_logs — join via rooms
create policy "hk_all" on public.housekeeping_logs for all to authenticated
  using (
    exists (
      select 1 from public.rooms r
      where r.id = room_id and can_access_property(r.property_id)
    )
  );

-- ============================================================
--  Realtime
-- ============================================================
alter publication supabase_realtime add table public.rooms;

-- ============================================================
--  Indexes
-- ============================================================
create index if not exists idx_floors_property     on public.floors(property_id);
create index if not exists idx_rooms_property      on public.rooms(property_id);
create index if not exists idx_rooms_floor         on public.rooms(floor_id);
create index if not exists idx_guests_property     on public.guests(property_id);
create index if not exists idx_contracts_property  on public.contracts(property_id);
create index if not exists idx_contracts_room      on public.contracts(room_id);
create index if not exists idx_invoices_contract   on public.monthly_invoices(contract_id);
create index if not exists idx_invoices_month      on public.monthly_invoices(property_id, year, month);
create index if not exists idx_bookings_property   on public.bookings(property_id);
create index if not exists idx_payments_property   on public.payments(property_id);
create index if not exists idx_expenses_property   on public.expenses(property_id);
