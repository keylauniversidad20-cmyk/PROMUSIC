import { useEffect, useMemo, useState, type ReactNode } from "react"
import { useNavigate } from "react-router"
import { supabase } from "./supabaseClient"
import "./admin.css"

type AdminSection = "summary" | "bookings" | "payments" | "people"
type BookingStatus = "pending" | "confirmed" | "cancelled" | string

type Booking = {
  id: string
  booking_date: string | null
  booking_time: string | null
  student_name: string
  student_email: string
  student_phone: string
  instrument: string
  preferred_schedule?: string | null
  teacher_id: string | null
  teacher_name?: string | null
  status: BookingStatus
  created_at?: string
}

type Profile = {
  id: string
  full_name: string | null
  email: string | null
  phone: string | null
  role: string
  instrument?: string | null
}

type PaymentSubmission = {
  id: string
  payer_name: string
  payer_email: string
  amount: number | string
  proof_path: string
  status: "pending" | "verified" | "rejected" | string
  verified_at: string | null
  created_at: string
}

type AdminIconName = "overview" | "calendar" | "people" | "payment" | "logout" | "search" | "music" | "clock" | "arrow"

function AdminIcon({ name, size = 20 }: { name: AdminIconName size?: number }) {
  const paths: Record<AdminIconName, ReactNode> = {
    overview: (
      <>
        <rect x="3" y="3" width="7" height="7" />
        <rect x="14" y="3" width="7" height="7" />
        <rect x="3" y="14" width="7" height="7" />
        <rect x="14" y="14" width="7" height="7" />
      </>
    ),
    calendar: (
      <>
        <rect x="3" y="5" width="18" height="16" rx="1" />
        <path d="M16 3v4M8 3v4M3 10h18" />
      </>
    ),
    people: (
      <>
        <circle cx="9" cy="8" r="3" />
        <path d="M3 20c0-4 2-6 6-6s6 2 6 6M16 5c2 .2 3 1.3 3 3s-1 2.8-3 3M17 14c2.7.6 4 2.5 4 6" />
      </>
    ),
    payment: (
      <>
        <rect x="3" y="5" width="18" height="14" rx="2" />
        <path d="M3 10h18M7 15h3" />
      </>
    ),
    logout: <path d="M10 5H4v14h6M14 8l4 4-4 4M8 12h10" />,
    search: (
      <>
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-4-4" />
      </>
    ),
    music: (
      <>
        <path d="M9 18V5l10-2v13" />
        <circle cx="6" cy="18" r="3" />
        <circle cx="16" cy="16" r="3" />
      </>
    ),
    clock: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </>
    ),
    arrow: <path d="M5 12h14m-6-6 6 6-6 6" />,
  }

  return (
    <svg
      aria-hidden="true"
      fill="none"
      height={size}
      viewBox="0 0 24 24"
      width={size}
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.8"
    >
      {paths[name]}
    </svg>
  )
}

const sectionLabels: Record<AdminSection, {
  eyebrow: string
  title: string
  description: string
}> = {
  summary: {
    eyebrow: "Vista general",
    title: "Resumen",
    description: "Todo lo importante de PROMUSIC EC, en un solo lugar.",
  },
  bookings: {
    eyebrow: "Agenda y seguimiento",
    title: "Reservas",
    description: "Consulta, filtra y actualiza las solicitudes de clase.",
  },
  people: {
    eyebrow: "Comunidad PROMUSIC",
    title: "Personas",
    description: "Profesores y estudiantes registrados en la academia.",
  },
  payments: {
    eyebrow: "Transferencias recibidas",
    title: "Pagos",
    description:
      "Revisa los comprobantes enviados y confirma cada transferencia.",
  },
}

function localDateKey(date = new Date()) {
  const offset = date.getTimezoneOffset() * 60_000
  return new Date(date.getTime() - offset).toISOString().slice(0, 10)
}

function formatDate(value: string | null) {
  if (!value) return "Sin fecha"
  return new Intl.DateTimeFormat("es-EC", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(`${value}T12:00:00`))
}

function formatTime(value: string | null, preferredSchedule?: string | null) {
  if (!value) return preferredSchedule || "Por definir"
  return value.slice(0, 5)
}

function statusLabel(status: BookingStatus) {
  if (status === "confirmed") return "Confirmada"
  if (status === "cancelled") return "Cancelada"
  return "Pendiente"
}

function personInitials(name: string | null) {
  if (!name) return "PE"
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase()
}

function paymentStatusLabel(status: PaymentSubmission["status"]) {
  if (status === "verified") return "Verificado"
  if (status === "rejected") return "Rechazado"
  return "Por verificar"
}

function formatPaymentDate(value: string) {
  return new Intl.DateTimeFormat("es-EC", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value))
}

export default function AdminPage() {
  const navigate = useNavigate()
  const [section, setSection] = useState<AdminSection>("summary")
  const [authorized, setAuthorized] = useState(false)
  const [checkingAccess, setCheckingAccess] = useState(true)
  const [bookings, setBookings] = useState<Booking[]>([])
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [payments, setPayments] = useState<PaymentSubmission[]>([])
  const [loadingData, setLoadingData] = useState(true)
  const [dataError, setDataError] = useState("")
  const [updatingId, setUpdatingId] = useState("")
  const [paymentUpdatingId, setPaymentUpdatingId] = useState("")
  const [proofUrls, setProofUrls] = useState<Record<string, string>>({})
  const [search, setSearch] = useState("")
  const [instrumentFilter, setInstrumentFilter] = useState("all")
  const [dateFilter, setDateFilter] = useState("")

  useEffect(() => {
    let active = true

    const verifyAccess = async () => {
      const { data: sessionData } = await supabase.auth.getSession()
      const user = sessionData.session?.user

      if (!user) {
        navigate("/", { replace: true })
        return
      }

      const { data: profile, error } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle()

      if (!active) return

      if (error || profile?.role !== "administrador") {
        navigate("/", { replace: true })
        return
      }

      setAuthorized(true)
      setCheckingAccess(false)
    }

    verifyAccess()

    const { data: authListener } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") navigate("/", { replace: true })
    })

    return () => {
      active = false
      authListener.subscription.unsubscribe()
    }
  }, [navigate])

  useEffect(() => {
    if (!authorized) return

    let active = true

    const loadData = async () => {
      setLoadingData(true)
      setDataError("")

      const [bookingsResult, profilesResult, paymentsResult] =
        await Promise.all([
          supabase
            .from("bookings")
            .select("*")
            .order("booking_date", { ascending: true })
            .order("booking_time", { ascending: true }),
          supabase
            .from("profiles")
            .select("*")
            .order("full_name", { ascending: true }),
          supabase
            .from("payment_submissions")
            .select("*")
            .order("created_at", { ascending: false }),
        ])

      if (!active) return

      if (
        bookingsResult.error ||
        profilesResult.error ||
        paymentsResult.error
      ) {
        setDataError(
          "No pudimos cargar la información. Comprueba las tablas y sus políticas RLS.",
        )
      }

      if (!bookingsResult.error)
        setBookings((bookingsResult.data ?? []) as Booking[])
      if (!profilesResult.error)
        setProfiles((profilesResult.data ?? []) as Profile[])
      if (!paymentsResult.error)
        setPayments((paymentsResult.data ?? []) as PaymentSubmission[])

      setLoadingData(false)
    }

    loadData()
    return () => {
      active = false
    }
  }, [authorized])

  const teacherById = useMemo(
    () =>
      new Map(
        profiles.map((profile) => [
          profile.id,
          profile.full_name || "Sin nombre",
        ]),
      ),
    [profiles],
  )

  const instruments = useMemo(
    () =>
      [
        ...new Set(
          bookings.map((booking) => booking.instrument).filter(Boolean),
        ),
      ].sort(),
    [bookings],
  )

  const filteredBookings = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase()
    return bookings.filter((booking) => {
      const matchesSearch =
        !normalizedSearch ||
        [
          booking.student_name,
          booking.student_email,
          booking.student_phone,
          booking.instrument,
          booking.teacher_name,
          booking.teacher_id ? teacherById.get(booking.teacher_id) : "",
        ].some((value) => value?.toLowerCase().includes(normalizedSearch))

      const matchesInstrument =
        instrumentFilter === "all" || booking.instrument === instrumentFilter
      const matchesDate = !dateFilter || booking.booking_date === dateFilter
      return matchesSearch && matchesInstrument && matchesDate
    })
  }, [bookings, dateFilter, instrumentFilter, search, teacherById])

  const metrics = useMemo(() => {
    const today = localDateKey()
    const start = new Date(`${today}T00:00:00`)
    const end = new Date(start)
    end.setDate(end.getDate() + 8)

    const instrumentCounts = bookings.reduce<Record<string, number>>(
      (counts, booking) => {
        if (booking.instrument)
          counts[booking.instrument] = (counts[booking.instrument] ?? 0) + 1
        return counts
      },
      {},
    )

    const favoriteInstrument =
      Object.entries(instrumentCounts).sort(
        ([, countA], [, countB]) => countB - countA,
      )[0]?.[0] ?? "Sin datos"

    return {
      total: bookings.length,
      today: bookings.filter(
        (booking) =>
          booking.booking_date === today && booking.status !== "cancelled",
      ).length,
      upcoming: bookings.filter((booking) => {
        if (!booking.booking_date) return false
        const bookingDate = new Date(`${booking.booking_date}T00:00:00`)
        return (
          bookingDate > start &&
          bookingDate < end &&
          booking.status !== "cancelled"
        )
      }).length,
      favoriteInstrument,
    }
  }, [bookings])

  const upcomingBookings = useMemo(() => {
    const today = localDateKey()
    return bookings
      .filter(
        (booking) =>
          Boolean(booking.booking_date) &&
          booking.booking_date! >= today &&
          booking.status !== "cancelled",
      )
      .slice(0, 5)
  }, [bookings])

  const updateBookingStatus = async (
    bookingId: string,
    status: "confirmed" | "cancelled",
  ) => {
    setUpdatingId(bookingId)
    setDataError("")

    const { error } = await supabase
      .from("bookings")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", bookingId)

    if (error) {
      setDataError(
        "No pudimos actualizar la reserva. Comprueba tus permisos de administrador.",
      )
    } else {
      setBookings((current) =>
        current.map((booking) =>
          booking.id === bookingId ? { ...booking, status } : booking,
        ),
      )
    }

    setUpdatingId("")
  }

  const loadProofUrl = async (payment: PaymentSubmission) => {
    setDataError("")
    const { data, error } = await supabase.storage
      .from("payment-proofs")
      .createSignedUrl(payment.proof_path, 120)

    if (error || !data.signedUrl) {
      setDataError(
        "No pudimos abrir el comprobante. Comprueba los permisos del bucket privado.",
      )
      return
    }

    setProofUrls((current) => ({ ...current, [payment.id]: data.signedUrl }))
  }

  const updatePaymentStatus = async (
    paymentId: string,
    status: "verified" | "rejected",
  ) => {
    setPaymentUpdatingId(paymentId)
    setDataError("")

    const { data: sessionData } = await supabase.auth.getSession()
    const now = new Date().toISOString()
    const { error } = await supabase
      .from("payment_submissions")
      .update({
        status,
        verified_at: status === "verified" ? now : null,
        verified_by:
          status === "verified" ? (sessionData.session?.user.id ?? null) : null,
        updated_at: now,
      })
      .eq("id", paymentId)

    if (error) {
      setDataError(
        "No pudimos actualizar el pago. Comprueba tus permisos de administrador.",
      )
    } else {
      setPayments((current) =>
        current.map((payment) =>
          payment.id === paymentId
            ? {
                ...payment,
                status,
                verified_at: status === "verified" ? now : null,
              }
            : payment,
        ),
      )
    }

    setPaymentUpdatingId("")
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    navigate("/", { replace: true })
  }

  if (checkingAccess || !authorized) {
    return (
      <section className="admin-loading" aria-live="polite">
        <div className="form-spinner" aria-hidden="true" />
        <p>Verificando acceso administrativo...</p>
      </section>
    )
  }

  const professors = profiles.filter((profile) => profile.role === "profesor")
  const students = profiles.filter((profile) => profile.role === "estudiante")
  const heading = sectionLabels[section]

  return (
    <section className="admin">
      <div className="admin__masthead">
        <div className="admin__masthead-grain" aria-hidden="true" />
        <div className="admin__masthead-inner">
          <div>
            <p className="eyebrow">Panel administrativo</p>
            <h1>
              GESTIONA
              <br />
              <em>PROMUSIC.</em>
            </h1>
          </div>
          <div className="admin__masthead-note">
            <span>Área privada</span>
            <p>
              Reservas, clases y comunidad en una experiencia clara y
              centralizada.
            </p>
          </div>
        </div>
      </div>

      <div className="admin__workspace">
        <aside className="admin-sidebar" aria-label="Navegación administrativa">
          <div className="admin-sidebar__label">MENÚ · 2026</div>
          <button
            className={section === "summary" ? "is-active" : ""}
            onClick={() => setSection("summary")}
          >
            <span>
              <AdminIcon name="overview" />
              Resumen
            </span>
            <small>01</small>
          </button>
          <button
            className={section === "bookings" ? "is-active" : ""}
            onClick={() => setSection("bookings")}
          >
            <span>
              <AdminIcon name="calendar" />
              Reservas
            </span>
            <small>02</small>
          </button>
          <button
            className={section === "payments" ? "is-active" : ""}
            onClick={() => setSection("payments")}
          >
            <span>
              <AdminIcon name="payment" />
              Pagos
            </span>
            <small>03</small>
          </button>
          <button
            className={section === "people" ? "is-active" : ""}
            onClick={() => setSection("people")}
          >
            <span>
              <AdminIcon name="people" />
              Profesores y estudiantes
            </span>
            <small>04</small>
          </button>
          <button className="admin-sidebar__logout" onClick={handleSignOut}>
            <span>
              <AdminIcon name="logout" />
              Cerrar sesión
            </span>
          </button>
        </aside>

        <div className="admin__content">
          <header className="admin-section-heading">
            <p className="eyebrow">{heading.eyebrow}</p>
            <h2>{heading.title}</h2>
            <p>{heading.description}</p>
          </header>

          {dataError && (
            <div className="admin-alert" role="alert">
              {dataError}
            </div>
          )}

          {loadingData ? (
            <div className="admin-data-loading">
              <div className="form-spinner" aria-hidden="true" />
              <span>Cargando información...</span>
            </div>
          ) : (
            <>
              {section === "summary" && (
                <div className="admin-summary">
                  <div className="admin-metric-grid">
                    <article className="admin-metric admin-metric--featured">
                      <span>01</span>
                      <AdminIcon name="calendar" size={28} />
                      <strong>{metrics.total}</strong>
                      <p>Total de reservas</p>
                    </article>
                    <article className="admin-metric">
                      <span>02</span>
                      <AdminIcon name="clock" size={28} />
                      <strong>{metrics.today}</strong>
                      <p>Clases de hoy</p>
                    </article>
                    <article className="admin-metric">
                      <span>03</span>
                      <AdminIcon name="arrow" size={28} />
                      <strong>{metrics.upcoming}</strong>
                      <p>Próximos 7 días</p>
                    </article>
                    <article className="admin-metric admin-metric--instrument">
                      <span>04</span>
                      <AdminIcon name="music" size={28} />
                      <strong>{metrics.favoriteInstrument}</strong>
                      <p>Instrumento más pedido</p>
                    </article>
                  </div>

                  <div className="admin-upcoming">
                    <div className="admin-upcoming__heading">
                      <div>
                        <p className="eyebrow">Agenda inmediata</p>
                        <h3>Próximas reservas</h3>
                      </div>
                      <button onClick={() => setSection("bookings")}>
                        Ver todas <AdminIcon name="arrow" size={17} />
                      </button>
                    </div>
                    <div className="admin-upcoming__list">
                      {upcomingBookings.map((booking, index) => (
                        <article key={booking.id}>
                          <span className="admin-upcoming__number">
                            0{index + 1}
                          </span>
                          <div>
                            <strong>{booking.student_name}</strong>
                            <small>{booking.instrument}</small>
                          </div>
                          <p>
                            {formatDate(booking.booking_date)} ·{" "}
                            {formatTime(
                              booking.booking_time,
                              booking.preferred_schedule,
                            )}
                          </p>
                          <span
                            className={`admin-status admin-status--${booking.status}`}
                          >
                            {statusLabel(booking.status)}
                          </span>
                        </article>
                      ))}
                      {upcomingBookings.length === 0 && (
                        <div className="admin-empty">
                          No hay próximas reservas registradas.
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {section === "bookings" && (
                <div className="admin-bookings">
                  <div className="admin-filters">
                    <label className="admin-search">
                      <AdminIcon name="search" size={18} />
                      <input
                        aria-label="Buscar reservas"
                        placeholder="Buscar alumno, contacto o instrumento"
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                      />
                    </label>
                    <label>
                      <span>Instrumento</span>
                      <select
                        value={instrumentFilter}
                        onChange={(event) =>
                          setInstrumentFilter(event.target.value)
                        }
                      >
                        <option value="all">Todos</option>
                        {instruments.map((instrument) => (
                          <option value={instrument} key={instrument}>
                            {instrument}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      <span>Fecha</span>
                      <input
                        type="date"
                        value={dateFilter}
                        onChange={(event) => setDateFilter(event.target.value)}
                      />
                    </label>
                  </div>

                  <div className="admin-table-wrap">
                    <table className="admin-table">
                      <thead>
                        <tr>
                          <th>Fecha y hora</th>
                          <th>Alumno</th>
                          <th>Contacto</th>
                          <th>Instrumento</th>
                          <th>Profesor</th>
                          <th>Estado</th>
                          <th>Acciones</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredBookings.map((booking) => (
                          <tr key={booking.id}>
                            <td>
                              <strong>
                                {formatDate(booking.booking_date)}
                              </strong>
                              <small>
                                {formatTime(
                                  booking.booking_time,
                                  booking.preferred_schedule,
                                )}
                              </small>
                            </td>
                            <td>
                              <strong>{booking.student_name}</strong>
                            </td>
                            <td>
                              <span>{booking.student_email}</span>
                              <small>{booking.student_phone}</small>
                            </td>
                            <td>{booking.instrument}</td>
                            <td>
                              {booking.teacher_name ||
                                (booking.teacher_id
                                  ? teacherById.get(booking.teacher_id)
                                  : null) ||
                                "Sin asignar"}
                            </td>
                            <td>
                              <span
                                className={`admin-status admin-status--${booking.status}`}
                              >
                                {statusLabel(booking.status)}
                              </span>
                            </td>
                            <td>
                              <div className="admin-table__actions">
                                <button
                                  className="admin-action admin-action--confirm"
                                  disabled={
                                    updatingId === booking.id ||
                                    booking.status === "confirmed"
                                  }
                                  onClick={() =>
                                    updateBookingStatus(booking.id, "confirmed")
                                  }
                                >
                                  Confirmar
                                </button>
                                <button
                                  className="admin-action admin-action--cancel"
                                  disabled={
                                    updatingId === booking.id ||
                                    booking.status === "cancelled"
                                  }
                                  onClick={() =>
                                    updateBookingStatus(booking.id, "cancelled")
                                  }
                                >
                                  Cancelar
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {filteredBookings.length === 0 && (
                      <div className="admin-empty">
                        No encontramos reservas con estos filtros.
                      </div>
                    )}
                  </div>
                </div>
              )}

              {section === "people" && (
                <div className="admin-people">
                  <PeopleList
                    title="Profesores"
                    eyebrow="Equipo docente"
                    people={professors}
                    emptyMessage="No hay profesores registrados."
                  />
                  <PeopleList
                    title="Estudiantes"
                    eyebrow="Comunidad"
                    people={students}
                    emptyMessage="No hay estudiantes registrados."
                  />
                </div>
              )}

              {section === "payments" && (
                <div className="admin-payments">
                  <div className="admin-table-wrap">
                    <table className="admin-table admin-payment-table">
                      <thead>
                        <tr>
                          <th>Enviado</th>
                          <th>Responsable</th>
                          <th>Valor</th>
                          <th>Comprobante</th>
                          <th>Estado</th>
                          <th>Verificación</th>
                        </tr>
                      </thead>
                      <tbody>
                        {payments.map((payment) => (
                          <tr key={payment.id}>
                            <td>
                              <strong>
                                {formatPaymentDate(payment.created_at)}
                              </strong>
                            </td>
                            <td>
                              <strong>{payment.payer_name}</strong>
                              <small>{payment.payer_email}</small>
                            </td>
                            <td>
                              <strong>
                                ${Number(payment.amount).toFixed(2)}
                              </strong>
                            </td>
                            <td>
                              {proofUrls[payment.id] ? (
                                <a
                                  className="admin-proof-button"
                                  href={proofUrls[payment.id]}
                                  target="_blank"
                                  rel="noreferrer"
                                >
                                  Abrir imagen
                                </a>
                              ) : (
                                <button
                                  className="admin-proof-button"
                                  type="button"
                                  onClick={() => loadProofUrl(payment)}
                                >
                                  Ver comprobante
                                </button>
                              )}
                            </td>
                            <td>
                              <span
                                className={`admin-status admin-status--${payment.status}`}
                              >
                                {paymentStatusLabel(payment.status)}
                              </span>
                            </td>
                            <td>
                              <div className="admin-table__actions">
                                <button
                                  className="admin-action admin-action--confirm"
                                  disabled={
                                    paymentUpdatingId === payment.id ||
                                    payment.status === "verified"
                                  }
                                  onClick={() =>
                                    updatePaymentStatus(payment.id, "verified")
                                  }
                                >
                                  Verificar
                                </button>
                                <button
                                  className="admin-action admin-action--cancel"
                                  disabled={
                                    paymentUpdatingId === payment.id ||
                                    payment.status === "rejected"
                                  }
                                  onClick={() =>
                                    updatePaymentStatus(payment.id, "rejected")
                                  }
                                >
                                  Rechazar
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {payments.length === 0 && (
                      <div className="admin-empty">
                        No hay comprobantes pendientes o registrados.
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </section>
  )
}

function PeopleList({
  title,
  eyebrow,
  people,
  emptyMessage,
}: {
  title: string
  eyebrow: string
  people: Profile[]
  emptyMessage: string
}) {
  return (
    <section className="admin-people-list">
      <header>
        <p className="eyebrow">{eyebrow}</p>
        <h3>{title}</h3>
        <span>{people.length.toString().padStart(2, "0")}</span>
      </header>
      <div>
        {people.map((person, index) => (
          <article key={person.id}>
            <span className="admin-person__index">
              {(index + 1).toString().padStart(2, "0")}
            </span>
            <span className="admin-person__avatar">
              {personInitials(person.full_name)}
            </span>
            <div>
              <strong>{person.full_name || "Sin nombre"}</strong>
              <p>{person.email || "Sin correo"}</p>
            </div>
            <div className="admin-person__meta">
              <span>{person.phone || "Sin teléfono"}</span>
              {person.instrument && <small>{person.instrument}</small>}
            </div>
          </article>
        ))}
        {people.length === 0 && (
          <div className="admin-empty">{emptyMessage}</div>
        )}
      </div>
    </section>
  )
}
