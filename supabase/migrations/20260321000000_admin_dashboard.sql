-- PROMUSIC EC admin dashboard schema and policies.
-- Apply through the normal Supabase migration workflow before using /admin.

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  email text,
  phone text,
  role text not null default 'estudiante'
    check (role in ('administrador', 'profesor', 'estudiante')),
  instrument text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(),
  booking_date date not null,
  booking_time time not null,
  student_name text not null,
  student_email text not null,
  student_phone text not null,
  instrument text not null,
  modality text,
  teacher_id uuid references public.profiles(id) on delete set null,
  teacher_name text,
  status text not null default 'pending'
    check (status in ('pending', 'confirmed', 'cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists bookings_date_idx
  on public.bookings (booking_date, booking_time);

create index if not exists bookings_instrument_idx
  on public.bookings (instrument);

create or replace function public.is_administrator()
returns boolean
language sql
stable
security definer
set search_path = pg_catalog
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'administrador'
  );
$$;

alter function public.is_administrator() owner to postgres;
revoke all on function public.is_administrator() from public, anon;
grant execute on function public.is_administrator() to authenticated;

alter table public.profiles enable row level security;
alter table public.bookings enable row level security;

revoke all on table public.profiles from anon;
revoke all on table public.bookings from anon;

grant select on table public.profiles to authenticated;
grant select, update on table public.bookings to authenticated;

create policy "Users can read their own profile"
on public.profiles
for select
to authenticated
using (id = auth.uid());

create policy "Administrators can read all profiles"
on public.profiles
for select
to authenticated
using (public.is_administrator());

create policy "Administrators can read all bookings"
on public.bookings
for select
to authenticated
using (public.is_administrator());

create policy "Administrators can update all bookings"
on public.bookings
for update
to authenticated
using (public.is_administrator())
with check (public.is_administrator());
