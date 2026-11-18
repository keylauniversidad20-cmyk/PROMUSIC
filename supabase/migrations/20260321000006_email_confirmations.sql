-- Correos transaccionales: triggers que llaman a la Edge Function
-- `server` (ruta /make-server-20d8848e/send-confirmation) mediante pg_net cuando se crea/actualiza una reserva o
-- un comprobante de pago. Los fallos de red NUNCA bloquean el insert.

create extension if not exists pg_net with schema extensions;

-- Configuración privada (solo service_role). Después de migrar ejecuta:
--   update public.email_config set
--     function_url   = 'https://<PROJECT_REF>.supabase.co/functions/v1/make-server-20d8848e/send-confirmation',
--     webhook_secret = '<mismo valor que EMAIL_WEBHOOK_SECRET>',
--     anon_key       = '<anon key pública del proyecto>'
--   where id = 'primary';
create table if not exists public.email_config (
  id text primary key check (id = 'primary'),
  function_url text not null default '',
  webhook_secret text not null default '',
  anon_key text not null default ''
);
insert into public.email_config (id) values ('primary') on conflict do nothing;

alter table public.email_config enable row level security;
revoke all on public.email_config from anon, authenticated;
grant select, update on public.email_config to service_role;

-- Registro de envíos + idempotencia (ref único).
create table if not exists public.email_log (
  id uuid primary key default gen_random_uuid(),
  ref text not null unique,
  kind text not null,
  recipient text not null,
  status text not null default 'sending',
  provider_id text,
  error text,
  created_at timestamptz not null default now()
);

alter table public.email_log enable row level security;
revoke all on public.email_log from anon, authenticated;
grant select, insert, update on public.email_log to service_role;

create or replace function public.notify_send_confirmation()
returns trigger
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  cfg public.email_config;
begin
  select * into cfg from public.email_config where id = 'primary';

  if cfg.function_url = '' or cfg.webhook_secret = '' then
    return new; -- aún no configurado: no hacer nada
  end if;

  begin
    perform net.http_post(
      url := cfg.function_url,
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-webhook-secret', cfg.webhook_secret,
        'Authorization', 'Bearer ' || cfg.anon_key
      ),
      body := jsonb_build_object(
        'type', tg_op,
        'table', tg_table_name,
        'record', to_jsonb(new),
        'old_record', case when tg_op = 'UPDATE' then to_jsonb(old) else null end
      )
    );
  exception when others then
    raise warning 'send-confirmation notify failed: %', sqlerrm;
  end;

  return new;
end;
$$;

revoke all on function public.notify_send_confirmation() from public, anon, authenticated;

drop trigger if exists bookings_email_insert on public.bookings;
create trigger bookings_email_insert
  after insert on public.bookings
  for each row execute function public.notify_send_confirmation();

drop trigger if exists bookings_email_status on public.bookings;
create trigger bookings_email_status
  after update of status on public.bookings
  for each row when (old.status is distinct from new.status)
  execute function public.notify_send_confirmation();

drop trigger if exists payments_email_insert on public.payment_submissions;
create trigger payments_email_insert
  after insert on public.payment_submissions
  for each row execute function public.notify_send_confirmation();

drop trigger if exists payments_email_status on public.payment_submissions;
create trigger payments_email_status
  after update of status on public.payment_submissions
  for each row when (old.status is distinct from new.status)
  execute function public.notify_send_confirmation();
