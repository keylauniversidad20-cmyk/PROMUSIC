// Plantillas de correo (HTML + texto plano). Estilos 100% inline y layout con
// tablas para máxima compatibilidad (Gmail, Outlook, Apple Mail).
// Identidad visual tomada del sitio: negro #0b0b0b, naranja #febd59, crema #f4f1e9.

export type EmailKind =
  | "booking_received"
  | "booking_confirmed"
  | "booking_cancelled"
  | "payment_received"
  | "payment_verified"
  | "payment_rejected"

export type Brand = {
  name: string
  siteUrl: string
  logoUrl: string
  supportEmail: string
  whatsapp: string
}

export type EmailData = {
  name: string
  details: Array<[label: string, value: string]>
}

type Copy = { subject: string; preheader: string; title: string; body: string }

const copy = (kind: EmailKind, brand: Brand, firstName: string): Copy => {
  switch (kind) {
    case "booking_received":
      return {
        subject: `Recibimos tu solicitud de clase de prueba, ${firstName}`,
        preheader: "Tu solicitud fue registrada. Te confirmaremos muy pronto.",
        title: "¡Solicitud recibida!",
        body: `Gracias por elegir ${brand.name}. Registramos tu solicitud de clase de prueba y nuestro equipo la revisará para confirmarte el horario.`,
      }
    case "booking_confirmed":
      return {
        subject: `Tu clase en ${brand.name} está confirmada`,
        preheader: "Tu reserva fue confirmada. Te esperamos.",
        title: "¡Clase confirmada!",
        body: "Tu reserva ha sido confirmada. Te esperamos con tu instrumento y muchas ganas de aprender.",
      }
    case "booking_cancelled":
      return {
        subject: `Tu reserva en ${brand.name} fue cancelada`,
        preheader: "Tu reserva fue cancelada. Puedes solicitar un nuevo horario.",
        title: "Reserva cancelada",
        body: "Tu reserva fue cancelada. Si fue un error o quieres elegir otro horario, escríbenos o solicita una nueva clase desde nuestro sitio.",
      }
    case "payment_received":
      return {
        subject: `Recibimos tu comprobante de pago, ${firstName}`,
        preheader: "Verificaremos tu transferencia y te avisaremos.",
        title: "Comprobante recibido",
        body: "Recibimos tu comprobante de transferencia. Lo verificaremos y te avisaremos por este mismo medio.",
      }
    case "payment_verified":
      return {
        subject: `Pago verificado en ${brand.name}`,
        preheader: "Tu transferencia fue verificada correctamente.",
        title: "¡Pago verificado!",
        body: "Verificamos tu transferencia correctamente. ¡Gracias por tu pago!",
      }
    case "payment_rejected":
      return {
        subject: `No pudimos verificar tu pago en ${brand.name}`,
        preheader: "Necesitamos que revises tu comprobante.",
        title: "No pudimos verificar tu pago",
        body: "No logramos validar tu comprobante. Por favor revisa que la imagen sea legible y vuelve a enviarlo, o contáctanos para ayudarte.",
      }
  }
}

export const escapeHtml = (value: string) =>
  value.replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[
        c
      ] || c,
  )

export function renderEmail(kind: EmailKind, brand: Brand, data: EmailData) {
  const firstName = data.name.trim().split(/\s+/)[0] || "hola"
  const c = copy(kind, brand, firstName)
  const e = escapeHtml

  const rows = data.details
    .filter(([, v]) => v)
    .map(
      ([label, value]) => `
        <tr>
          <td style="padding:10px 0;border-bottom:1px solid #e4dfd2;font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:#6b665a;width:40%;">${e(label)}</td>
          <td style="padding:10px 0;border-bottom:1px solid #e4dfd2;font-size:15px;font-weight:700;color:#0b0b0b;">${e(value)}</td>
        </tr>`,
    )
    .join("")

  const waDigits = brand.whatsapp.replace(/\D/g, "")
  const waLink = waDigits ? `https://wa.me/${waDigits}` : ""

  const html = `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light">
<title>${e(c.subject)}</title>
</head>
<body style="margin:0;padding:0;background:#f4f1e9;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:#f4f1e9;">${e(c.preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f1e9;">
  <tr><td align="center" style="padding:32px 16px;">
    <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;background:#ffffff;border-radius:6px;overflow:hidden;font-family:Manrope,'Helvetica Neue',Arial,sans-serif;">
      <tr><td align="center" style="background:#0b0b0b;padding:28px 24px;border-bottom:4px solid #febd59;">
        <img src="${e(brand.logoUrl)}" alt="${e(brand.name)}" height="48" style="display:block;height:48px;width:auto;border:0;">
      </td></tr>
      <tr><td style="padding:40px 36px 8px;">
        <p style="margin:0 0 10px;font-size:12px;font-weight:800;letter-spacing:.14em;text-transform:uppercase;color:#e99a21;">${e(brand.name)}</p>
        <h1 style="margin:0 0 16px;font-family:Syne,'Helvetica Neue',Arial,sans-serif;font-size:30px;line-height:1.15;color:#0b0b0b;">${e(c.title)}</h1>
        <p style="margin:0 0 8px;font-size:16px;line-height:1.6;color:#2a2a2a;">Hola ${e(firstName)},</p>
        <p style="margin:0 0 24px;font-size:16px;line-height:1.6;color:#2a2a2a;">${e(c.body)}</p>
      </td></tr>
      ${
        rows
          ? `<tr><td style="padding:0 36px 24px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f1e9;border-radius:4px;border-left:4px solid #febd59;">
          <tr><td style="padding:12px 20px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0">${rows}</table></td></tr>
        </table>
      </td></tr>`
          : ""
      }
      <tr><td align="center" style="padding:0 36px 36px;">
        <a href="${e(brand.siteUrl)}" style="display:inline-block;background:#febd59;color:#0b0b0b;font-weight:800;font-size:15px;text-decoration:none;padding:14px 28px;border-radius:4px;">Visitar ${e(brand.name)}</a>
        ${waLink ? `<p style="margin:18px 0 0;font-size:14px;color:#555;">¿Dudas? Escríbenos por <a href="${e(waLink)}" style="color:#e99a21;font-weight:700;">WhatsApp</a> o responde este correo.</p>` : `<p style="margin:18px 0 0;font-size:14px;color:#555;">¿Dudas? Responde este correo.</p>`}
      </td></tr>
      <tr><td style="background:#0b0b0b;padding:22px 36px;text-align:center;">
        <p style="margin:0;font-size:12px;line-height:1.6;color:#b9b4a8;">Recibes este correo porque realizaste una solicitud en ${e(brand.name)}.<br>Es un mensaje transaccional; no necesitas suscribirte a nada.</p>
      </td></tr>
    </table>
  </td></tr>
</table>
</body>
</html>`

  const text = [
    c.title,
    "",
    `Hola ${firstName},`,
    c.body,
    "",
    ...data.details.filter(([, v]) => v).map(([l, v]) => `${l}: ${v}`),
    "",
    `${brand.name} — ${brand.siteUrl}`,
    waLink ? `WhatsApp: ${waLink}` : "",
  ]
    .filter((line, i, arr) => line !== "" || arr[i - 1] !== "")
    .join("\n")

  return { subject: c.subject, html, text }
}
