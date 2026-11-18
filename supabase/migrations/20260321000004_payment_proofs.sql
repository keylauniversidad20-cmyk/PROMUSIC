-- Private payment proof uploads with administrator-only review.

create table if not exists public.payment_submissions (
  id uuid primary key default gen_random_uuid(),
  payer_name text not null,
  payer_email text not null,
  amount numeric(10, 2) not null check (amount > 0),
  proof_path text not null unique,
  status text not null default 'pending'
    check (status in ('pending', 'verified', 'rejected')),
  verified_at timestamptz,
  verified_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.payment_submissions enable row level security;

revoke all on table public.payment_submissions from anon, authenticated;

grant insert (
  payer_name,
  payer_email,
  amount,
  proof_path,
  status
)
on public.payment_submissions
to anon, authenticated;

grant select, update
on public.payment_submissions
to authenticated;

drop policy if exists "Public can submit pending payment proofs"
on public.payment_submissions;
create policy "Public can submit pending payment proofs"
on public.payment_submissions
for insert
to anon, authenticated
with check (status = 'pending');

drop policy if exists "Administrators can read payment submissions"
on public.payment_submissions;
create policy "Administrators can read payment submissions"
on public.payment_submissions
for select
to authenticated
using (public.is_administrator());

drop policy if exists "Administrators can update payment submissions"
on public.payment_submissions;
create policy "Administrators can update payment submissions"
on public.payment_submissions
for update
to authenticated
using (public.is_administrator())
with check (public.is_administrator());

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'payment-proofs',
  'payment-proofs',
  false,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Public can upload payment proof images"
on storage.objects;
create policy "Public can upload payment proof images"
on storage.objects
for insert
to anon, authenticated
with check (
  bucket_id = 'payment-proofs'
  and (storage.foldername(name))[1] = 'public'
  and lower(storage.extension(name)) in ('jpg', 'jpeg', 'png', 'webp')
);

drop policy if exists "Administrators can read payment proof images"
on storage.objects;
create policy "Administrators can read payment proof images"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'payment-proofs'
  and public.is_administrator()
);
