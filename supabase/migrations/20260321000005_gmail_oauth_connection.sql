create table if not exists public.gmail_oauth_connections (
  id text primary key check (id = 'primary'),
  refresh_token text not null,
  account_email text not null,
  scope text not null,
  connected_at timestamptz not null default now(),
  connected_by uuid not null references auth.users(id)
);

alter table public.gmail_oauth_connections enable row level security;

revoke all on table public.gmail_oauth_connections from anon, authenticated;
grant select, insert, update, delete
  on table public.gmail_oauth_connections
  to service_role;

comment on table public.gmail_oauth_connections is
  'Backend-only Gmail OAuth connection. Access is restricted to the service role.';
