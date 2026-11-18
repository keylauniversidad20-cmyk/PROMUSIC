# Correos de confirmación (Gmail) — puesta en marcha

Flujo: el sitio inserta en `bookings` / `payment_submissions` (UI sin cambios) →
trigger Postgres → `pg_net` → Edge Function `server` (ruta `/make-server-20d8848e/send-confirmation`, en `supabase/functions/server/index.tsx`) → Gmail API (la cuenta ya conectada
en el panel admin) → bandeja del usuario.

Correos: solicitud recibida, reserva confirmada/cancelada, comprobante recibido, pago verificado/rechazado
(los de estado salen cuando el admin cambia el estado en el panel).

## 1. Requisitos
- Gmail conectado desde el panel admin (botón de conexión existente). Debe usar el scope `gmail.send` (ya incluido).
- En Google Cloud, la pantalla de consentimiento OAuth en **“En producción”**: en modo *Testing* el refresh token caduca a los 7 días.
- Limites de Gmail: ~500 correos/día (cuenta gratuita) o ~2000 (Workspace). Suficiente para una academia.

## 2. Entregabilidad
Gmail firma con su propio SPF/DKIM, así que los correos enviados desde `@gmail.com` salen autenticados.
Para mejor reputación usa una cuenta **Google Workspace con tu dominio** (ej. `reservas@tudominio.com`) y configura:

| Tipo | Host | Valor |
|---|---|---|
| TXT (SPF) | `tudominio.com` | `v=spf1 include:_spf.google.com ~all` |
| TXT (DKIM) | `google._domainkey` | clave generada en Admin Google → Apps → Gmail → Autenticar correo |
| TXT (DMARC) | `_dmarc.tudominio.com` | `v=DMARC1; p=none; rua=mailto:dmarc@tudominio.com; adkim=r; aspf=r` |

Tras 2–4 semanas sin problemas, sube DMARC a `p=quarantine`. Prueba con mail-tester.com.
Ya aplicado en el código: HTML + texto plano, Reply-To, Message-ID propio, asunto sin “spam words”, envío solo a quien hizo la acción.

## 3. Despliegue
```bash
cp .env.example .env.functions   # edita valores
supabase secrets set --env-file .env.functions
supabase functions deploy server
supabase db push                 # aplica la migración 000006
```
(Si `GMAIL_OAUTH_CLIENT_ID/SECRET` ya están como secrets del proyecto, no hace falta repetirlos.)

Luego en el SQL editor:
```sql
update public.email_config set
  function_url   = 'https://afymkpcxncaianzlrfzu.supabase.co/functions/v1/make-server-20d8848e/send-confirmation',
  webhook_secret = '<mismo EMAIL_WEBHOOK_SECRET>',
  anon_key       = '<anon key pública, ver utils/supabase/info.tsx>'
where id = 'primary';
```

## 4. Probar
Envía una solicitud desde `/reservar`, luego:
`select * from public.email_log order by created_at desc;` y `supabase functions logs server`.

## 5. Supabase Auth (correo de confirmación de cuenta)
Supabase Auth solo envía correos de **autenticación** (registro, enlace mágico, restablecer contraseña). No puede enviar avisos de reservas ni pagos; esos siguen en la función `server`.

1. Dashboard → Authentication → Emails → **SMTP Settings**: activa SMTP propio (con Gmail/Workspace: `smtp.gmail.com`, puerto 465, usuario = la cuenta, contraseña de aplicación). El SMTP por defecto de Supabase está limitado a pocos correos por hora y tiende a Spam.
2. Authentication → Emails → **Confirm signup**: pega el contenido de `supabase/templates/confirmation.html` y pon el asunto "Confirma tu correo en PROMUSIC EC".
3. Authentication → URL Configuration: define *Site URL* con tu dominio.
