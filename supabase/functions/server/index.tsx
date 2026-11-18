import { Hono } from "npm:hono"
import { cors } from "npm:hono/cors"
import { logger } from "npm:hono/logger"
import { createClient } from "jsr:@supabase/supabase-js@2.49.8"
import * as kv from "./kv_store.tsx"

const app = new Hono()

// Enable logger
app.use("*", logger(console.log))

// Enable CORS for all routes and methods
app.use(
  "/*",
  cors({
    origin: "*",
    allowHeaders: ["Content-Type", "Authorization", "x-webhook-secret"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
  }),
)

// Health check endpoint
app.get("/make-server-20d8848e/health", (c) => {
  return c.json({ status: "ok" })
})

const createServiceClient = () => {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Supabase server credentials are not configured.")
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}

const getBearerToken = (authorizationHeader?: string) => {
  const match = authorizationHeader?.match(/^Bearer\s+(.+)$/i)
  return match?.[1]?.trim() || null
}

const getAuthenticatedUser = async (authorizationHeader?: string) => {
  const token = getBearerToken(authorizationHeader)
  if (!token) {
    return { error: "missing_token" as const, user: null }
  }

  const supabase = createServiceClient()
  const { data, error } = await supabase.auth.getUser(token)

  if (error || !data.user) {
    return { error: "invalid_token" as const, user: null }
  }

  return { error: null, user: data.user }
}

// Use this guard on every future administrative operation. Client-side checks
// may improve the interface, but they must never replace this server check.
const requireAdmin = async (authorizationHeader?: string) => {
  const authentication = await getAuthenticatedUser(authorizationHeader)

  if (authentication.error || !authentication.user) {
    return { error: authentication.error, user: null }
  }

  const supabase = createServiceClient()
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", authentication.user.id)
    .maybeSingle()

  if (
    authentication.user.app_metadata?.role !== "admin" &&
    profile?.role !== "administrador"
  ) {
    return { error: "admin_required" as const, user: null }
  }

  return { error: null, user: authentication.user }
}

const gmailRoutePrefix = "/make-server-20d8848e/gmail/oauth"
const gmailStatePrefix = "gmail-oauth-state:"
const gmailOAuthScope = [
  "openid",
  "email",
  "https://www.googleapis.com/auth/gmail.send",
].join(" ")

const getGmailOAuthConfig = () => {
  const clientId = Deno.env.get("GMAIL_OAUTH_CLIENT_ID")?.trim()
  const clientSecret = Deno.env.get("GMAIL_OAUTH_CLIENT_SECRET")?.trim()
  const supabaseUrl = Deno.env.get("SUPABASE_URL")?.replace(/\/+$/, "")

  if (!clientId || !clientSecret || !supabaseUrl) {
    return null
  }

  return {
    clientId,
    clientSecret,
    redirectUri: `${supabaseUrl}/functions/v1${gmailRoutePrefix}/callback`,
  }
}

const escapeHtml = (value: string) =>
  value.replace(
    /[&<>"']/g,
    (character) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;",
      })[character] || character,
  )

const oauthResultPage = (title: string, message: string, success = false) =>
  new Response(
    `<!doctype html>
<html lang="es">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${escapeHtml(title)}</title>
  </head>
  <body style="margin:0;background:#f5f3ee;color:#171717;font-family:system-ui,sans-serif">
    <main style="max-width:560px;margin:12vh auto;padding:32px">
      <p style="font-size:14px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:${
        success ? "#28724f" : "#9b2c2c"
      }">${success ? "Conexión confirmada" : "No se completó la conexión"}</p>
      <h1 style="font-size:32px;line-height:1.15;margin:12px 0">${escapeHtml(title)}</h1>
      <p style="font-size:17px;line-height:1.6">${escapeHtml(message)}</p>
      <p style="font-size:14px;color:#666;margin-top:28px">Puedes cerrar esta ventana y volver al panel administrativo.</p>
    </main>
  </body>
</html>`,
    {
      status: success ? 200 : 400,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
        "Content-Security-Policy":
          "default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; frame-ancestors 'none'",
      },
    },
  )

app.get(`${gmailRoutePrefix}/start`, async (c) => {
  const authorization = await requireAdmin(c.req.header("Authorization"))
  if (authorization.error || !authorization.user) {
    return c.json(
      { error: "No tienes permisos para conectar la cuenta de Gmail." },
      403,
    )
  }

  const config = getGmailOAuthConfig()
  if (!config) {
    return c.json(
      { error: "La conexión de Gmail aún no está configurada en el servidor." },
      503,
    )
  }

  try {
    const state = crypto.randomUUID()
    const expiresAt = Date.now() + 10 * 60 * 1000
    await kv.set(`${gmailStatePrefix}${state}`, {
      requestedBy: authorization.user.id,
      expiresAt,
    })

    const authorizationUrl = new URL(
      "https://accounts.google.com/o/oauth2/v2/auth",
    )
    authorizationUrl.searchParams.set("client_id", config.clientId)
    authorizationUrl.searchParams.set("redirect_uri", config.redirectUri)
    authorizationUrl.searchParams.set("response_type", "code")
    authorizationUrl.searchParams.set("scope", gmailOAuthScope)
    authorizationUrl.searchParams.set("access_type", "offline")
    authorizationUrl.searchParams.set("prompt", "consent")
    authorizationUrl.searchParams.set("include_granted_scopes", "true")
    authorizationUrl.searchParams.set("state", state)

    return c.json({
      authorizationUrl: authorizationUrl.toString(),
      expiresAt: new Date(expiresAt).toISOString(),
    })
  } catch (error) {
    console.error(
      "Starting Gmail OAuth failed:",
      error instanceof Error ? error.message : "Unknown server error",
    )
    return c.json({ error: "No se pudo iniciar la conexión con Gmail." }, 500)
  }
})

app.get(`${gmailRoutePrefix}/callback`, async (c) => {
  const state = c.req.query("state")?.trim()
  if (!state) {
    return oauthResultPage(
      "Solicitud inválida",
      "La respuesta de Google no incluye el identificador de seguridad.",
    )
  }

  try {
    const stateKey = `${gmailStatePrefix}${state}`
    const pendingState = await kv.get(stateKey)
    if (!pendingState) {
      return oauthResultPage(
        "Solicitud vencida o ya utilizada",
        "Inicia nuevamente la conexión desde el panel administrativo.",
      )
    }

    await kv.del(stateKey)

    if (
      typeof pendingState.expiresAt !== "number" ||
      pendingState.expiresAt < Date.now() ||
      typeof pendingState.requestedBy !== "string"
    ) {
      return oauthResultPage(
        "Solicitud vencida",
        "Inicia nuevamente la conexión desde el panel administrativo.",
      )
    }

    if (c.req.query("error")) {
      return oauthResultPage(
        "Google no autorizó la conexión",
        "No se realizaron cambios. Puedes intentarlo de nuevo cuando desees.",
      )
    }

    const code = c.req.query("code")?.trim()
    const config = getGmailOAuthConfig()
    if (!code || !config) {
      return oauthResultPage(
        "No se pudo completar la conexión",
        "Falta el código de autorización o la configuración segura del servidor.",
      )
    }

    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: config.clientId,
        client_secret: config.clientSecret,
        redirect_uri: config.redirectUri,
        grant_type: "authorization_code",
      }),
    })
    const tokenData = await tokenResponse.json().catch(() => ({}))

    if (
      !tokenResponse.ok ||
      typeof tokenData.access_token !== "string" ||
      typeof tokenData.refresh_token !== "string"
    ) {
      console.error("Gmail OAuth token exchange failed:", tokenResponse.status)
      return oauthResultPage(
        "Google no entregó una conexión válida",
        "Revoca el acceso anterior si es necesario e inicia nuevamente la conexión.",
      )
    }

    const profileResponse = await fetch(
      "https://openidconnect.googleapis.com/v1/userinfo",
      {
        headers: { Authorization: `Bearer ${tokenData.access_token}` },
      },
    )
    const profile = await profileResponse.json().catch(() => ({}))

    if (
      !profileResponse.ok ||
      typeof profile.email !== "string" ||
      profile.email_verified !== true
    ) {
      return oauthResultPage(
        "No se pudo verificar la cuenta",
        "Google autorizó el acceso, pero no fue posible confirmar el correo conectado.",
      )
    }

    const { error: connectionError } = await createServiceClient()
      .from("gmail_oauth_connections")
      .upsert({
        id: "primary",
        refresh_token: tokenData.refresh_token,
        account_email: profile.email,
        scope:
          typeof tokenData.scope === "string"
            ? tokenData.scope
            : gmailOAuthScope,
        connected_at: new Date().toISOString(),
        connected_by: pendingState.requestedBy,
      })

    if (connectionError) {
      throw connectionError
    }

    return oauthResultPage(
      "Gmail quedó conectado",
      `La cuenta ${profile.email} fue verificada correctamente. Los correos de confirmación se enviarán desde esta cuenta.`,
      true,
    )
  } catch (error) {
    console.error(
      "Completing Gmail OAuth failed:",
      error instanceof Error ? error.message : "Unknown server error",
    )
    return oauthResultPage(
      "No se pudo completar la conexión",
      "Ocurrió un error seguro en el servidor. Inténtalo nuevamente.",
    )
  }
})

app.get(`${gmailRoutePrefix}/status`, async (c) => {
  const authorization = await requireAdmin(c.req.header("Authorization"))
  if (authorization.error) {
    return c.json(
      { error: "No tienes permisos para consultar la conexión de Gmail." },
      403,
    )
  }

  try {
    const { data: connection, error } = await createServiceClient()
      .from("gmail_oauth_connections")
      .select("id, account_email, connected_at")
      .eq("id", "primary")
      .maybeSingle()

    if (error) {
      throw error
    }

    return c.json({
      configured: Boolean(getGmailOAuthConfig()),
      connected: Boolean(connection?.id),
      accountEmail: connection?.account_email || null,
      connectedAt: connection?.connected_at || null,
    })
  } catch (error) {
    console.error(
      "Loading Gmail OAuth status failed:",
      error instanceof Error ? error.message : "Unknown server error",
    )
    return c.json({ error: "No se pudo consultar la conexión de Gmail." }, 500)
  }
})

const paymentBucket = "payment-proofs"
const paymentPrefix = "payment-submission:"
const allowedProofTypes: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
}

const ensurePaymentBucket = async () => {
  const supabase = createServiceClient()
  const { error: bucketError } = await supabase.storage.getBucket(paymentBucket)

  if (bucketError) {
    const { error: createError } = await supabase.storage.createBucket(
      paymentBucket,
      {
        public: false,
        fileSizeLimit: 5 * 1024 * 1024,
        allowedMimeTypes: Object.keys(allowedProofTypes),
      },
    )

    if (
      createError &&
      !createError.message.toLowerCase().includes("already exists")
    ) {
      throw createError
    }
  }

  return supabase
}

app.post("/make-server-20d8848e/payment-submissions", async (c) => {
  let uploadedPath = ""

  try {
    const formData = await c.req.raw.formData()
    const payerName = String(formData.get("payerName") || "").trim()
    const payerEmail = String(formData.get("payerEmail") || "")
      .trim()
      .toLowerCase()
    const amount = Number(formData.get("amount"))
    const proof = formData.get("proof")

    if (payerName.length < 2 || payerName.length > 120) {
      return c.json(
        { error: "Ingresa el nombre de quien realizó la transferencia." },
        400,
      )
    }

    if (
      payerEmail.length > 254 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payerEmail)
    ) {
      return c.json({ error: "Ingresa un correo electrónico válido." }, 400)
    }

    if (!Number.isFinite(amount) || amount <= 0 || amount > 100000) {
      return c.json({ error: "Ingresa un valor transferido válido." }, 400)
    }

    if (!(proof instanceof File) || !allowedProofTypes[proof.type]) {
      return c.json(
        { error: "Usa una imagen en formato JPG, PNG o WebP." },
        400,
      )
    }

    if (proof.size <= 0 || proof.size > 5 * 1024 * 1024) {
      return c.json({ error: "La imagen no puede superar los 5 MB." }, 400)
    }

    const id = crypto.randomUUID()
    const extension = allowedProofTypes[proof.type]
    uploadedPath = `public/${id}.${extension}`
    const supabase = await ensurePaymentBucket()
    const { error: uploadError } = await supabase.storage
      .from(paymentBucket)
      .upload(uploadedPath, proof, {
        contentType: proof.type,
        cacheControl: "3600",
        upsert: false,
      })

    if (uploadError) throw uploadError

    const now = new Date().toISOString()
    const submission = {
      id,
      payer_name: payerName,
      payer_email: payerEmail,
      amount,
      proof_path: uploadedPath,
      status: "pending",
      verified_at: null,
      verified_by: null,
      created_at: now,
      updated_at: now,
    }

    await kv.set(`${paymentPrefix}${id}`, submission)
    return c.json({ submission: { id } }, 201)
  } catch (error) {
    if (uploadedPath) {
      await createServiceClient()
        .storage.from(paymentBucket)
        .remove([uploadedPath])
    }
    console.error(
      "Payment proof submission failed:",
      error instanceof Error ? error.message : "Unknown server error",
    )
    return c.json(
      { error: "No pudimos guardar el comprobante. Inténtalo nuevamente." },
      500,
    )
  }
})

app.get("/make-server-20d8848e/admin/payment-submissions", async (c) => {
  const authorization = await requireAdmin(c.req.header("Authorization"))
  if (authorization.error) {
    return c.json(
      { error: "No tienes permisos para consultar los comprobantes." },
      403,
    )
  }

  try {
    const storedPayments = await kv.getByPrefix(paymentPrefix)
    const { data: tablePayments } = await createServiceClient()
      .from("payment_submissions")
      .select("*")
    const paymentsById = new Map<string, Record<string, unknown>>()

    for (const payment of [...(tablePayments || []), ...storedPayments]) {
      if (payment?.id) paymentsById.set(payment.id, payment)
    }

    const payments = [...paymentsById.values()].sort((a, b) =>
      String(b.created_at).localeCompare(String(a.created_at)),
    )
    return c.json({ payments })
  } catch (error) {
    console.error(
      "Loading payment submissions failed:",
      error instanceof Error ? error.message : "Unknown server error",
    )
    return c.json({ error: "No pudimos cargar los comprobantes." }, 500)
  }
})

app.get(
  "/make-server-20d8848e/admin/payment-submissions/:id/proof",
  async (c) => {
    const authorization = await requireAdmin(c.req.header("Authorization"))
    if (authorization.error) {
      return c.json(
        { error: "No tienes permisos para abrir este comprobante." },
        403,
      )
    }

    const id = c.req.param("id")
    let payment = await kv.get(`${paymentPrefix}${id}`)

    if (!payment) {
      const { data } = await createServiceClient()
        .from("payment_submissions")
        .select("proof_path")
        .eq("id", id)
        .maybeSingle()
      payment = data
    }

    if (!payment?.proof_path) {
      return c.json({ error: "No encontramos el comprobante." }, 404)
    }

    const { data, error } = await createServiceClient()
      .storage.from(paymentBucket)
      .createSignedUrl(payment.proof_path, 120)

    if (error || !data?.signedUrl) {
      return c.json({ error: "No pudimos abrir el comprobante." }, 500)
    }

    return c.json({ signedUrl: data.signedUrl })
  },
)

app.put("/make-server-20d8848e/admin/payment-submissions/:id", async (c) => {
  const authorization = await requireAdmin(c.req.header("Authorization"))
  if (authorization.error || !authorization.user) {
    return c.json(
      { error: "No tienes permisos para actualizar este comprobante." },
      403,
    )
  }

  const body = await c.req.json().catch(() => ({}))
  const status = body?.status
  if (status !== "verified" && status !== "rejected") {
    return c.json({ error: "El estado solicitado no es válido." }, 400)
  }

  const id = c.req.param("id")
  const key = `${paymentPrefix}${id}`
  const storedPayment = await kv.get(key)
  const now = new Date().toISOString()
  const changes = {
    status,
    verified_at: status === "verified" ? now : null,
    verified_by: status === "verified" ? authorization.user.id : null,
    updated_at: now,
  }

  if (storedPayment) {
    const payment = { ...storedPayment, ...changes }
    await kv.set(key, payment)
    return c.json({ payment })
  }

  const { data, error } = await createServiceClient()
    .from("payment_submissions")
    .update(changes)
    .eq("id", id)
    .select("*")
    .maybeSingle()

  if (error || !data) {
    return c.json({ error: "No pudimos actualizar el comprobante." }, 500)
  }

  return c.json({ payment: data })
})

app.post("/make-server-20d8848e/admin/bootstrap", async (c) => {
  try {
    const authorizedEmail = Deno.env
      .get("INITIAL_ADMIN_EMAIL")
      ?.trim()
      .toLowerCase()
    if (!authorizedEmail) {
      return c.json(
        { error: "La inicialización del administrador no está configurada." },
        503,
      )
    }

    const authentication = await getAuthenticatedUser(
      c.req.header("Authorization"),
    )
    if (authentication.error || !authentication.user) {
      return c.json({ error: "Se requiere una sesión válida." }, 401)
    }

    const user = authentication.user
    const userEmail = user.email?.trim().toLowerCase()

    if (!user.email_confirmed_at) {
      return c.json(
        { error: "El correo de la cuenta debe estar confirmado." },
        403,
      )
    }

    if (!userEmail || userEmail !== authorizedEmail) {
      return c.json(
        { error: "Esta cuenta no está autorizada para la inicialización." },
        403,
      )
    }

    const currentRole = user.app_metadata?.role
    if (currentRole === "admin") {
      const supabase = createServiceClient()
      const { data, error } = await supabase.auth.admin.getUserById(user.id)

      if (error || data.user?.app_metadata?.role !== "admin") {
        return c.json(
          { error: "No se pudo verificar el rol administrativo." },
          500,
        )
      }

      return c.json({ initialized: true, alreadyInitialized: true })
    }

    if (typeof currentRole === "string" && currentRole.length > 0) {
      return c.json(
        {
          error:
            "La cuenta ya tiene un rol y no puede modificarse mediante esta operación.",
        },
        409,
      )
    }

    const supabase = createServiceClient()
    const { error: updateError } = await supabase.auth.admin.updateUserById(
      user.id,
      {
        app_metadata: {
          ...user.app_metadata,
          role: "admin",
        },
      },
    )

    if (updateError) {
      return c.json({ error: "No se pudo asignar el rol administrativo." }, 500)
    }

    const { data: verification, error: verificationError } =
      await supabase.auth.admin.getUserById(user.id)

    if (
      verificationError ||
      verification.user?.app_metadata?.role !== "admin"
    ) {
      return c.json(
        { error: "El rol no pudo verificarse después de la actualización." },
        500,
      )
    }

    return c.json({ initialized: true, alreadyInitialized: false })
  } catch (error) {
    console.error(
      "Admin bootstrap failed:",
      error instanceof Error ? error.message : "Unknown server error",
    )
    return c.json({ error: "No se pudo completar la inicialización." }, 500)
  }
})

// ---------------------------------------------------------------------------
// Correos transaccionales (disparados por triggers de Postgres vía pg_net).
// Envía con la cuenta de Gmail conectada en el panel admin.
// ---------------------------------------------------------------------------
import { renderEmail, type EmailKind, type Brand } from "./email_template.tsx"

const emailRoute = "/make-server-20d8848e/send-confirmation"
const env = (k: string) => Deno.env.get(k)?.trim() || ""
const siteUrl = (env("SITE_URL") || "https://promusic.ec").replace(/\/+$/, "")
const brand: Brand = {
  name: env("BRAND_NAME") || "PROMUSIC EC",
  siteUrl,
  logoUrl: env("LOGO_URL") || `${siteUrl}/assets/promusic-logo.png`,
  supportEmail: env("EMAIL_REPLY_TO"),
  whatsapp: env("WHATSAPP_NUMBER"),
}
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  })

const timingSafeEqual = (a: string, b: string) => {
  const ea = new TextEncoder().encode(a)
  const eb = new TextEncoder().encode(b)
  if (ea.length !== eb.length) return false
  let diff = 0
  for (let i = 0; i < ea.length; i++) diff |= ea[i] ^ eb[i]
  return diff === 0
}

const fmtDate = (d?: string | null) =>
  d
    ? new Intl.DateTimeFormat("es-EC", {
        dateStyle: "full",
        timeZone: "UTC",
      }).format(new Date(`${d}T00:00:00Z`))
    : ""

type Row = Record<string, any>

function resolve(
  table: string,
  type: string,
  rec: Row,
  old: Row | null,
): { kind: EmailKind; to: string; name: string; details: [string, string][]; ref: string } | null {
  if (table === "bookings") {
    const details: [string, string][] = [
      ["Instrumento", rec.instrument || ""],
      ["Modalidad", rec.modality || ""],
      ["Fecha", fmtDate(rec.booking_date)],
      ["Hora", rec.booking_time ? String(rec.booking_time).slice(0, 5) : ""],
    ]
    const base = { to: rec.student_email, name: rec.student_name || "", details }
    if (type === "INSERT")
      return { ...base, kind: "booking_received", ref: `booking:${rec.id}:received` }
    if (type === "UPDATE" && old?.status !== rec.status) {
      if (rec.status === "confirmed")
        return { ...base, kind: "booking_confirmed", ref: `booking:${rec.id}:confirmed` }
      if (rec.status === "cancelled")
        return { ...base, kind: "booking_cancelled", ref: `booking:${rec.id}:cancelled` }
    }
    return null
  }
  if (table === "payment_submissions") {
    const details: [string, string][] = [
      ["Monto", rec.amount != null ? `$${Number(rec.amount).toFixed(2)}` : ""],
    ]
    const base = { to: rec.payer_email, name: rec.payer_name || "", details }
    if (type === "INSERT")
      return { ...base, kind: "payment_received", ref: `payment:${rec.id}:received` }
    if (type === "UPDATE" && old?.status !== rec.status) {
      if (rec.status === "verified")
        return { ...base, kind: "payment_verified", ref: `payment:${rec.id}:verified` }
      if (rec.status === "rejected")
        return { ...base, kind: "payment_rejected", ref: `payment:${rec.id}:rejected` }
    }
  }
  return null
}

const b64 = (bytes: Uint8Array) => {
  let bin = ""
  for (const byte of bytes) bin += String.fromCharCode(byte)
  return btoa(bin)
}
const b64url = (str: string) =>
  b64(new TextEncoder().encode(str)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")
const wrap76 = (s: string) => s.replace(/(.{76})/g, "$1\r\n")
const utf8b64 = (s: string) => wrap76(b64(new TextEncoder().encode(s)))

// Usa la conexión de Gmail ya autorizada por el admin (gmail_oauth_connections).
async function getGmailAccess(supabase: ReturnType<typeof createClient>) {
  const { data, error } = await supabase
    .from("gmail_oauth_connections")
    .select("refresh_token, account_email")
    .eq("id", "primary")
    .maybeSingle()
  if (error || !data) throw new Error("Gmail no está conectado en el panel admin")

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: env("GMAIL_OAUTH_CLIENT_ID"),
      client_secret: env("GMAIL_OAUTH_CLIENT_SECRET"),
      refresh_token: data.refresh_token,
      grant_type: "refresh_token",
    }),
  })
  const tok = await res.json().catch(() => ({}))
  if (!res.ok || !tok.access_token) throw new Error(`token_refresh_${res.status}`)
  return { token: tok.access_token as string, account: data.account_email as string }
}

async function sendGmail(
  token: string,
  account: string,
  to: string,
  subject: string,
  html: string,
  text: string,
  ref: string,
) {
  const fromName = env("BRAND_NAME") || brand.name
  const replyTo = env("EMAIL_REPLY_TO")
  const boundary = `b_${crypto.randomUUID()}`
  const domain = account.split("@")[1] || "gmail.com"
  const mime = [
    `From: =?UTF-8?B?${b64(new TextEncoder().encode(fromName))}?= <${account}>`,
    `To: ${to}`,
    ...(replyTo ? [`Reply-To: ${replyTo}`] : []),
    `Subject: =?UTF-8?B?${b64(new TextEncoder().encode(subject))}?=`,
    `Message-ID: <${crypto.randomUUID()}@${domain}>`,
    `X-Entity-Ref-ID: ${ref}`,
    "MIME-Version: 1.0",
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    "",
    `--${boundary}`,
    'Content-Type: text/plain; charset="UTF-8"',
    "Content-Transfer-Encoding: base64",
    "",
    utf8b64(text),
    `--${boundary}`,
    'Content-Type: text/html; charset="UTF-8"',
    "Content-Transfer-Encoding: base64",
    "",
    utf8b64(html),
    `--${boundary}--`,
    "",
  ].join("\r\n")

  const res = await fetch(
    "https://gmail.googleapis.com/gmail/v1/users/me/messages/send",
    {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ raw: b64url(mime) }),
    },
  )
  const out = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(`gmail_${res.status}: ${JSON.stringify(out)}`)
  return (out.id as string) ?? null
}

app.post(`${emailRoute}`, async (c) => {
  const req = c.req.raw

  const secret = env("EMAIL_WEBHOOK_SECRET")
  if (!secret || !timingSafeEqual(req.headers.get("x-webhook-secret") || "", secret))
    return json({ error: "unauthorized" }, 401)

  const payload = await req.json().catch(() => null)
  if (!payload?.table || !payload?.record) return json({ error: "bad_payload" }, 400)

  const msg = resolve(payload.table, payload.type, payload.record, payload.old_record ?? null)
  if (!msg) return json({ skipped: true })

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(msg.to || ""))
    return json({ skipped: "invalid_recipient" })

  const supabase = createClient(env("SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"), {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  // Idempotencia: la clave única impide enviar dos veces el mismo correo.
  const { error: claimError } = await supabase
    .from("email_log")
    .insert({ ref: msg.ref, kind: msg.kind, recipient: msg.to, status: "sending" })
  if (claimError) {
    if (claimError.code === "23505") return json({ skipped: "duplicate" })
    console.error("email_log insert failed:", claimError.message)
    return json({ error: "log_failed" }, 500)
  }

  const { subject, html, text } = renderEmail(msg.kind, brand, {
    name: msg.name,
    details: msg.details,
  })

  let sentId: string | null = null
  let failure: string | null = null
  try {
    const { token, account } = await getGmailAccess(supabase)
    sentId = await sendGmail(token, account, msg.to, subject, html, text, msg.ref)
  } catch (e) {
    failure = e instanceof Error ? e.message : "unknown"
  }

  await supabase
    .from("email_log")
    .update({
      status: failure ? "failed" : "sent",
      provider_id: sentId,
      error: failure ? failure.slice(0, 500) : null,
    })
    .eq("ref", msg.ref)

  if (failure) {
    console.error("Gmail send error:", failure)
    return json({ error: "send_failed" }, 502)
  }
  return json({ sent: true, id: sentId })
})

Deno.serve(app.fetch)
