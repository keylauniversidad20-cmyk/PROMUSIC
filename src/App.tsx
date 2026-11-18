import { useCallback, useEffect, useState, type ReactNode } from "react"
import {
  createBrowserRouter,
  Link,
  NavLink,
  Outlet,
  RouterProvider,
  useLocation,
  useNavigation,
} from "react-router"
import AdminLoginPage from "./AdminLoginPage"
import AdminPage from "./AdminPage"
import SupabaseConnectionStatus from "./SupabaseConnectionStatus"
import { supabase } from "./supabaseClient"

const images = {
  heroChildPiano:
    "https://images.unsplash.com/photo-1602744739578-6daf0302b76a?auto=format&fit=crop&w=1100&q=88",
  heroGirlDrummer:
    "https://images.unsplash.com/photo-1649731581999-ae46d94c7518?auto=format&fit=crop&w=800&q=88",
  heroSinger:
    "https://images.unsplash.com/photo-1575425848014-4a2bacf94e79?auto=format&fit=crop&w=800&q=88",
  piano:
    "https://images.unsplash.com/photo-1577877777751-3f1ec20a0715?auto=format&fit=crop&w=900&q=85",
  guitar: "/assets/promusic-guitar-student.jpg",
  drums:
    "https://images.unsplash.com/photo-1649731539203-8745abf89519?auto=format&fit=crop&w=900&q=85",
  ukulele: "/assets/promusic-ukulele-student.jpg",
  voice: "/assets/promusic-canto-class.png",
  violin:
    "https://images.unsplash.com/photo-1709227842288-6bbf27d97393?auto=format&fit=crop&w=900&q=86",
  studio:
    "https://images.unsplash.com/photo-1514320291840-2e0a9bf2a9ae?auto=format&fit=crop&w=1400&q=85",
}

const paymentProofMimeTypes: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
}

function getPaymentProofErrorMessage(error: unknown) {
  const message =
    error && typeof error === "object" && "message" in error
      ? String(error.message).toLowerCase()
      : ""

  if (
    message.includes("bucket") &&
    (message.includes("not found") || message.includes("does not exist"))
  ) {
    return "El servicio de comprobantes aún no está configurado. Comunícate con PROMUSIC para completar el envío."
  }

  if (
    message.includes("row-level security") ||
    message.includes("unauthorized") ||
    message.includes("permission")
  ) {
    return "La carga de comprobantes no está habilitada en este momento. Comunícate con PROMUSIC."
  }

  if (message.includes("mime") || message.includes("content type")) {
    return "Usa una imagen en formato JPG, PNG o WebP."
  }

  if (
    message.includes("fetch") ||
    message.includes("network") ||
    message.includes("connection")
  ) {
    return "No pudimos conectar con el servicio. Revisa tu conexión e inténtalo nuevamente."
  }

  return "No pudimos enviar el comprobante. Inténtalo nuevamente en unos minutos."
}

// Contenido editable del sitio. Actualiza aquí textos e información general.
const siteContent = {
  hero: {
    eyebrow: "TU EDAD NO DEFINE TU TALENTO.",
    titleLead: "LA MÚSICA SÍ PUEDE",
    titleAccent: "TRANSFORMAR",
    titleEnd: "TU VIDA.",
    subtitle:
      "Aprende, disfruta y desarrolla tu talento musical a cualquier edad.",
    description:
      "Desde los 5 años hasta adultos, encuentra el instrumento que conecta contigo y aprende con clases grupales o personalizadas, adaptadas a tu ritmo.",
    instruments: ["Piano", "Guitarra", "Batería", "Canto", "Violín", "Ukelele"],
    reassurance:
      "No importa si estás empezando desde cero o quieres mejorar tus habilidades. Aquí comienza tu historia con la música.",
    primaryButton: "AGENDA TU CLASE DE PRUEBA",
    secondaryButton: "CONOCE NUESTROS CURSOS",
  },
  contact: {
    address: "Calle Larga y Mariano Cueva",
    city: "Cuenca, Ecuador",
    shortLocation: "Calle Larga y Mariano Cueva · Cuenca",
    audiences: "Niños · Jóvenes · Adultos",
    hours: "Horarios flexibles",
  },
  instrumentsSection: {
    eyebrow: "Nuestros instrumentos",
    title: "Encuentra tu sonido",
    description: "Aprende el instrumento que siempre quisiste tocar.",
  },
  team: [
    {
      name: "Paula Bernal",
      role: "Profesora de Música",
      initials: "PB",
      number: "01",
    },
    {
      name: "Mark Solano",
      role: "Músico / Educador",
      initials: "MS",
      number: "02",
    },
    {
      name: "Keyla Solano",
      role: "Parte del equipo de PROMUSIC EC",
      initials: "KS",
      number: "03",
    },
    {
      name: "Samantha Sagñay",
      role: "Parte del equipo de PROMUSIC EC",
      initials: "SS",
      number: "04",
    },
  ],
}

type IconName = "arrow" | "menu" | "close" | "music" | "users" | "clock" | "spark" | "room" | "guitar" | "pencil" | "book" | "pin" | "instagram" | "facebook" | "tiktok" | "whatsapp"

function Icon({ name, size = 22 }: { name: IconName size?: number }) {
  const paths: Record<IconName, ReactNode> = {
    arrow: (
      <>
        <path d="M5 12h14" />
        <path d="m13 6 6 6-6 6" />
      </>
    ),
    menu: (
      <>
        <path d="M4 7h16" />
        <path d="M4 17h16" />
      </>
    ),
    close: (
      <>
        <path d="m6 6 12 12" />
        <path d="m18 6-12 12" />
      </>
    ),
    music: (
      <>
        <path d="M9 18V5l10-2v13" />
        <circle cx="6" cy="18" r="3" />
        <circle cx="16" cy="16" r="3" />
      </>
    ),
    users: (
      <>
        <circle cx="9" cy="8" r="3" />
        <path d="M3 20c0-4 2-6 6-6s6 2 6 6" />
        <path d="M16 5c2 .2 3 1.3 3 3s-1 2.8-3 3" />
        <path d="M17 14c2.7.6 4 2.5 4 6" />
      </>
    ),
    clock: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </>
    ),
    spark: (
      <>
        <path d="m12 2 1.5 6.5L20 10l-6.5 1.5L12 18l-1.5-6.5L4 10l6.5-1.5L12 2Z" />
        <path d="m5 16 .6 2.4L8 19l-2.4.6L5 22l-.6-2.4L2 19l2.4-.6L5 16Z" />
      </>
    ),
    room: (
      <>
        <path d="M4 20V5h16v15" />
        <path d="M8 20V9h8v11M2 20h20" />
      </>
    ),
    guitar: (
      <>
        <path d="m14 6 4-4 4 4-4 4" />
        <path d="m17 7-7 7" />
        <path d="M11 13c2 2 1 5-1 7s-6 2-8 0 0-6 2-8 5-3 7 1Z" />
        <circle cx="7" cy="17" r="1.5" />
      </>
    ),
    pencil: (
      <>
        <path d="m4 16-1 5 5-1L20 8l-4-4L4 16Z" />
        <path d="m14 6 4 4" />
      </>
    ),
    book: (
      <>
        <path d="M3 5c4-1 7 0 9 2v14c-2-2-5-3-9-2V5Z" />
        <path d="M21 5c-4-1-7 0-9 2v14c2-2 5-3 9-2V5Z" />
      </>
    ),
    pin: (
      <>
        <path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z" />
        <circle cx="12" cy="10" r="2.5" />
      </>
    ),
    instagram: (
      <>
        <rect x="3" y="3" width="18" height="18" rx="5" />
        <circle cx="12" cy="12" r="4" />
        <circle cx="17.5" cy="6.5" r=".8" fill="currentColor" stroke="none" />
      </>
    ),
    facebook: (
      <path d="M14 21v-8h3l.5-4H14V7c0-1.2.4-2 2.2-2H18V1.5c-.8-.1-1.8-.3-3-.3-3 0-5 1.8-5 5.2V9H7v4h3v8" />
    ),
    tiktok: (
      <>
        <path d="M15 4v11.5a5 5 0 1 1-4-4.9" />
        <path d="M15 4c.8 3 2.5 4.5 5 5" />
      </>
    ),
    whatsapp: (
      <>
        <path d="M20 11.5a8 8 0 0 1-12 7L3 20l1.5-4.5A8 8 0 1 1 20 11.5Z" />
        <path d="M9 8c.5 3 2 4.5 5 5l1-1" />
      </>
    ),
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

function Logo({ light = false }: { light?: boolean }) {
  return (
    <Link
      className={`logo ${light ? "logo--light" : ""}`}
      to="/"
      aria-label="PROMUSIC EC — Inicio"
    >
      <img src="/assets/promusic-logo.png" alt="PROMUSIC EC" />
    </Link>
  )
}

function Button({
  children,
  href,
  variant = "primary",
}: {
  children: ReactNode
  href: string
  variant?: "primary" | "outline" | "dark"
}) {
  return (
    <Link className={`button button--${variant}`} to={href}>
      <span>{children}</span>
      <Icon name="arrow" size={19} />
    </Link>
  )
}

function SectionHeading({
  eyebrow,
  title,
  description,
  light = false,
}: {
  eyebrow: string
  title: string
  description?: string
  light?: boolean
}) {
  return (
    <header
      className={`section-heading ${light ? "section-heading--light" : ""}`}
    >
      <p className="eyebrow">{eyebrow}</p>
      <h2>{title}</h2>
      {description && (
        <p className="section-heading__description">{description}</p>
      )}
    </header>
  )
}

const instruments = [
  {
    name: "Piano",
    slug: "piano",
    description: "Técnica, armonía y expresión desde la primera tecla.",
    image: images.piano,
    lessonImage:
      "https://images.unsplash.com/photo-1696522732406-065ef560da8c?auto=format&fit=crop&w=1400&q=86",
    photoCredit: "Andrey K",
    code: "01",
    age: "Desde 5 años",
    level: "Inicial a avanzado",
    classStyle: "Individual o grupal",
    detail:
      "Las clases combinan lectura musical, coordinación de ambas manos y canciones elegidas según la edad. Cada estudiante aprende en un piano real con ejercicios cortos, retos semanales y acompañamiento cercano.",
    learning: [
      "Postura y digitación",
      "Lectura de partituras",
      "Acordes y melodías",
      "Repertorio personal",
    ],
  },
  {
    name: "Guitarra",
    slug: "guitarra",
    description: "Acordes, ritmo y repertorio para encontrar tu propio estilo.",
    image: images.guitar,
    lessonImage: "/assets/promusic-guitar-student.jpg",
    photoCredit: "PROMUSIC EC",
    code: "02",
    age: "Niños y adultos",
    level: "Desde cero",
    classStyle: "Individual o grupal",
    detail:
      "Empezamos con canciones sencillas para desarrollar confianza desde la primera clase. Trabajamos acordes, cambios limpios, rasgueos y acompañamiento para que el estudiante pueda tocar sus temas favoritos.",
    learning: [
      "Acordes básicos",
      "Ritmos y rasgueos",
      "Afinación",
      "Canciones completas",
    ],
  },
  {
    name: "Batería",
    slug: "bateria",
    description: "Coordinación, energía y groove en cada sesión.",
    image: images.drums,
    lessonImage:
      "https://images.unsplash.com/photo-1776464487858-9bd497910008?auto=format&fit=crop&w=1400&q=86",
    photoCredit: "Jorge Antonio Palmero Guerrero",
    code: "03",
    age: "Desde 7 años",
    level: "Inicial e intermedio",
    classStyle: "Clases prácticas",
    detail:
      "Cada sesión sucede frente al instrumento. El estudiante descubre patrones, coordinación y pulso con canciones reales, ejercicios progresivos y práctica guiada para tocar con seguridad junto a otros músicos.",
    learning: [
      "Coordinación corporal",
      "Ritmos esenciales",
      "Técnica de baquetas",
      "Tocar en ensamble",
    ],
  },
  {
    name: "Ukelele",
    slug: "ukelele",
    description: "Un instrumento cercano, alegre y perfecto para comenzar.",
    image: images.ukulele,
    lessonImage: "/assets/promusic-ukulele-student.jpg",
    photoCredit: "PROMUSIC EC",
    code: "04",
    age: "Desde 5 años",
    level: "Ideal para empezar",
    classStyle: "Lúdica y grupal",
    detail:
      "Una clase alegre y dinámica para acercarse a la música sin presión. Con juegos rítmicos y canciones conocidas, los estudiantes aprenden acordes sencillos mientras fortalecen oído, memoria y coordinación.",
    learning: [
      "Primeros acordes",
      "Ritmo básico",
      "Canto y acompañamiento",
      "Seguridad al tocar",
    ],
  },
  {
    name: "Canto",
    slug: "canto",
    description: "Conoce tu voz, respira mejor y canta con seguridad.",
    image: images.voice,
    lessonImage: "/assets/promusic-canto-class.png",
    photoCredit: "PROMUSIC EC",
    code: "05",
    age: "Jóvenes y adultos",
    level: "Todos los niveles",
    classStyle: "Individual o grupal",
    detail:
      "Trabajamos la voz como un instrumento único. Las clases incluyen calentamiento, respiración, afinación e interpretación, siempre cuidando la salud vocal y el estilo propio de cada estudiante.",
    learning: [
      "Respiración y apoyo",
      "Afinación",
      "Proyección vocal",
      "Interpretación escénica",
    ],
  },
  {
    name: "Violín",
    slug: "violin",
    description: "Sensibilidad, postura y sonido guiados paso a paso.",
    image: images.violin,
    lessonImage:
      "https://images.unsplash.com/photo-1586351011807-b79c8ef43057?auto=format&fit=crop&w=1400&q=86",
    photoCredit: "Tetiana Shyshkina",
    code: "06",
    age: "Desde 6 años",
    level: "Inicial e intermedio",
    classStyle: "Proceso personalizado",
    detail:
      "El avance se construye con paciencia y objetivos claros. Aprendemos postura, manejo del arco y afinación mediante pequeñas melodías que ayudan a desarrollar sensibilidad, disciplina y oído musical.",
    learning: [
      "Postura saludable",
      "Control del arco",
      "Afinación y oído",
      "Melodías progresivas",
    ],
  },
]

type Instrument = typeof instruments[number]

function getInstrumentPhotoAlt(instrument: Instrument) {
  if (instrument.slug === "guitarra")
    return "Niño practicando guitarra clásica con una partitura"
  if (instrument.slug === "ukelele")
    return "Niña tocando el ukelele frente a un micrófono"
  if (instrument.slug === "canto")
    return "Profesora acompañando a dos niñas durante una clase de canto"
  if (instrument.slug === "violin")
    return "Mujer joven de aproximadamente 22 años tocando el violín"
  return `Estudiante practicando ${instrument.name.toLowerCase()} en una clase de música`
}

function InstrumentCard({
  instrument,
  onSelect,
  selected = false,
}: {
  instrument: Instrument
  onSelect?: (instrument: Instrument) => void
  selected?: boolean
}) {
  const imageContent = (
    <>
      <img src={instrument.image} alt={getInstrumentPhotoAlt(instrument)} />
      <span>{instrument.code}</span>
      <small>{instrument.age}</small>
    </>
  )

  return (
    <article
      className={`instrument-card ${selected ? "is-selected" : ""}`}
      id={instrument.slug}
    >
      {onSelect ? (
        <button
          className="instrument-card__image instrument-card__image-action"
          type="button"
          aria-label={`Ver información de las clases de ${instrument.name}`}
          aria-expanded={selected}
          onClick={() => onSelect(instrument)}
        >
          {imageContent}
        </button>
      ) : (
        <Link
          className="instrument-card__image instrument-card__image-action"
          to={`/instrumentos#clases-${instrument.slug}`}
          aria-label={`Ver información de las clases de ${instrument.name}`}
        >
          {imageContent}
        </Link>
      )}
      <div className="instrument-card__content">
        <h3>{instrument.name}</h3>
        <p>{instrument.description}</p>
        {onSelect ? (
          <button
            type="button"
            aria-expanded={selected}
            onClick={() => onSelect(instrument)}
          >
            {selected ? "Información visible" : "Conocer las clases"}{" "}
            <Icon name="arrow" size={18} />
          </button>
        ) : (
          <Link to={`/instrumentos#clases-${instrument.slug}`}>
            Conocer las clases <Icon name="arrow" size={18} />
          </Link>
        )}
      </div>
    </article>
  )
}

const benefits = [
  { number: "01", title: "Desde los 5 años", icon: "music" as IconName },
  { number: "02", title: "Clases personalizadas", icon: "spark" as IconName },
  { number: "03", title: "Modalidad grupal", icon: "users" as IconName },
  { number: "04", title: "Horarios flexibles", icon: "clock" as IconName },
]

const plans = [
  { name: "Plan 1", hours: "1 hora", price: "45", featured: false },
  { name: "Plan 2", hours: "2 horas", price: "55", featured: true },
  { name: "Plan 3", hours: "3 horas", price: "65", featured: false },
]

const services = [
  {
    title: "Salas de ensayo",
    description: "Espacios para practicar y ensayar.",
    icon: "room" as IconName,
    number: "01",
  },
  {
    title: "Instrumentos y accesorios",
    description: "Encuentra lo que necesitas para tu música.",
    icon: "guitar" as IconName,
    number: "02",
  },
  {
    title: "Dibujo creativo",
    description: "Talleres para desarrollar tu creatividad.",
    icon: "pencil" as IconName,
    number: "03",
  },
  {
    title: "Inglés básico",
    description: "Aprende inglés mientras desarrollas nuevas habilidades.",
    icon: "book" as IconName,
    number: "04",
  },
]

const steps = [
  "Pide información",
  "Agenda tu clase de prueba",
  "Realiza tu matrícula",
  "Comienza tus clases",
]

const reservationSteps = [
  "Datos del estudiante",
  "Instrumento",
  "Modalidad",
  "Horario",
  "Confirmación",
]
const instrumentOptions = [
  "Piano",
  "Guitarra",
  "Batería",
  "Ukelele",
  "Canto",
  "Violín",
]
const modalityOptions = ["Clase individual", "Clase grupal"]
const hourlySlots = Array.from(
  { length: 11 },
  (_, index) => `${String(index + 9).padStart(2, "0")}:00`,
)

type TrialRequest = {
  firstName: string
  lastName: string
  age: string
  phone: string
  email: string
  instrument: string
  modality: string
  bookingDate: string
  bookingTime: string
}

const emptyTrialRequest: TrialRequest = {
  firstName: "",
  lastName: "",
  age: "",
  phone: "",
  email: "",
  instrument: "",
  modality: "",
  bookingDate: "",
  bookingTime: "",
}

type TrialRequestErrors = Partial<Record<keyof TrialRequest, string>>

function getLocalDateInputValue(date = new Date()) {
  const timezoneOffset = date.getTimezoneOffset() * 60_000
  return new Date(date.getTime() - timezoneOffset).toISOString().slice(0, 10)
}

async function submitTrialRequest(request: TrialRequest) {
  const { error } = await supabase.from("bookings").insert({
    booking_date: request.bookingDate,
    booking_time: `${request.bookingTime}:00`,
    student_name: `${request.firstName.trim()} ${request.lastName.trim()}`,
    student_email: request.email.trim().toLowerCase(),
    student_phone: request.phone.trim(),
    instrument: request.instrument,
    modality: request.modality,
    teacher_name: "Por asignar",
    status: "pending",
  })

  if (error) {
    console.error("Supabase no pudo insertar la reserva:", {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint,
    })
    throw new BookingInsertError(error.message, error.code)
  }
}

class BookingInsertError extends Error {
  code?: string

  constructor(message: string, code?: string) {
    super(message)
    this.name = "BookingInsertError"
    this.code = code
  }
}

const navItems = [
  ["Inicio", "/"],
  ["Nosotros", "/nosotros"],
  ["Instrumentos", "/instrumentos"],
  ["Programas", "/programas"],
  ["Planes", "/planes"],
  ["Servicios", "/servicios"],
  ["Equipo", "/equipo"],
  ["Contacto", "/contacto"],
] as const

function Header() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const location = useLocation()
  const solid = location.pathname !== "/" || scrolled

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 30)
    onScroll()
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  useEffect(() => {
    setMenuOpen(false)
  }, [location.pathname])

  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : ""
    return () => {
      document.body.style.overflow = ""
    }
  }, [menuOpen])

  const navClass = ({
    isActive,
    isPending,
  }: {
    isActive: boolean
    isPending: boolean
  }) =>
    [isActive ? "is-active" : "", isPending ? "is-pending" : ""]
      .filter(Boolean)
      .join(" ")

  return (
    <>
      <nav
        className={`nav ${solid ? "nav--scrolled" : ""}`}
        aria-label="Navegación principal"
      >
        <div className="nav__inner">
          <Logo light />
          <div className="nav__links">
            {navItems.map(([label, to]) => (
              <NavLink
                className={navClass}
                end={to === "/"}
                to={to}
                key={label}
              >
                {label}
              </NavLink>
            ))}
          </div>
          <button
            className="nav__toggle"
            type="button"
            aria-expanded={menuOpen}
            aria-controls="mobile-navigation"
            aria-label={menuOpen ? "Cerrar menú" : "Abrir menú"}
            onClick={() => setMenuOpen(!menuOpen)}
          >
            <Icon name={menuOpen ? "close" : "menu"} />
          </button>
        </div>
      </nav>

      <div
        className={`mobile-menu ${menuOpen ? "mobile-menu--open" : ""}`}
        id="mobile-navigation"
      >
        <div className="mobile-menu__number">PROMUSIC EC · MENÚ</div>
        {navItems.map(([label, to], index) => (
          <NavLink className={navClass} end={to === "/"} to={to} key={label}>
            <small>0{index + 1}</small>
            {label}
          </NavLink>
        ))}
        <NavLink className="mobile-menu__cta" to="/reservar">
          Agenda tu clase
        </NavLink>
        <p>Cuenca, Ecuador</p>
      </div>
    </>
  )
}

function HeroSection() {
  return (
    <section className="hero" id="inicio">
      <div className="hero__grain" />
      <div className="hero__content">
        <div className="hero__copy">
          <p className="hero__kicker">{siteContent.hero.eyebrow}</p>
          <h1>
            {siteContent.hero.titleLead} <em>{siteContent.hero.titleAccent}</em>{" "}
            {siteContent.hero.titleEnd}
          </h1>
          <p className="hero__subtitle">{siteContent.hero.subtitle}</p>
          <p className="hero__description">{siteContent.hero.description}</p>
          <div className="hero__instruments" aria-label="Cursos disponibles">
            {siteContent.hero.instruments.map((instrument) => (
              <span key={instrument}>
                <Icon name="music" size={13} />
                {instrument}
              </span>
            ))}
          </div>
          <p className="hero__reassurance">{siteContent.hero.reassurance}</p>
          <div className="hero__actions">
            <Button href="/reservar">{siteContent.hero.primaryButton}</Button>
            <Button href="/instrumentos" variant="outline">
              {siteContent.hero.secondaryButton}
            </Button>
          </div>
          <div className="hero__meta">
            <span>
              <Icon name="pin" size={15} />
              {siteContent.contact.shortLocation}
            </span>
            <span>
              <Icon name="users" size={15} />
              {siteContent.contact.audiences}
            </span>
          </div>
        </div>
        <div
          className="hero-collage"
          aria-label="Personas de diferentes edades aprendiendo música"
        >
          <figure className="hero-collage__main">
            <img
              src={images.heroChildPiano}
              alt="Niño aprendiendo a tocar un piano real"
            />
            <figcaption>Aprende a tu ritmo</figcaption>
          </figure>
          <figure className="hero-collage__top">
            <img
              src={images.heroGirlDrummer}
              alt="Niña disfrutando mientras toca una batería con tambores y platillos"
            />
          </figure>
          <figure className="hero-collage__bottom">
            <img
              src={images.heroSinger}
              alt="Adulta cantando con confianza frente a un micrófono de estudio"
            />
          </figure>
          <div className="hero-collage__badge">
            <strong>5+</strong>
            <span>Años en adelante</span>
          </div>
        </div>
      </div>
    </section>
  )
}

function Marquee() {
  return (
    <div className="marquee" aria-hidden="true">
      <div className="marquee__track">
        <span>Piano</span>
        <i>✦</i>
        <span>Guitarra</span>
        <i>✦</i>
        <span>Batería</span>
        <i>✦</i>
        <span>Ukelele</span>
        <i>✦</i>
        <span>Canto</span>
        <i>✦</i>
        <span>Violín</span>
        <i>✦</i>
        <span>Piano</span>
        <i>✦</i>
        <span>Guitarra</span>
        <i>✦</i>
        <span>Batería</span>
        <i>✦</i>
        <span>Ukelele</span>
        <i>✦</i>
        <span>Canto</span>
        <i>✦</i>
        <span>Violín</span>
        <i>✦</i>
      </div>
    </div>
  )
}

function InstrumentsSection({ onSelectInstrument, selectedSlug }: {
  onSelectInstrument?: (instrument: Instrument) => void
  selectedSlug?: string | null
} = {}) {
  return (
    <section className="section instruments" id="instrumentos">
      <div className="container">
        <SectionHeading
          eyebrow={siteContent.instrumentsSection.eyebrow}
          title={siteContent.instrumentsSection.title}
          description={siteContent.instrumentsSection.description}
        />
        <div className="age-callout">
          <div>
            <strong>Para todas las edades</strong>
            <span>Desde los 5 años hasta adultos.</span>
          </div>
          <div className="age-callout__groups">
            <span>Niños</span>
            <span>Jóvenes</span>
            <span>Adultos</span>
          </div>
        </div>
        <div className="instrument-grid">
          {instruments.map((instrument) => (
            <InstrumentCard
              instrument={instrument}
              key={instrument.name}
              onSelect={onSelectInstrument}
              selected={selectedSlug === instrument.slug}
            />
          ))}
        </div>
      </div>
    </section>
  )
}

function InstrumentDetailsSection({
  instrument,
  onClose,
}: {
  instrument: Instrument
  onClose: () => void
}) {
  return (
    <section
      className="instrument-details"
      id={`clases-${instrument.slug}`}
      aria-labelledby="instrument-details-title"
    >
      <div className="container">
        <header className="instrument-details__intro">
          <div>
            <p className="eyebrow">Así vivimos la música</p>
            <h2 id="instrument-details-title">
              Clases para aprender
              <br />
              <em>haciendo.</em>
            </h2>
          </div>
          <p>
            Cada programa se adapta a la edad, experiencia y objetivos del
            estudiante. Conoce cómo se desarrolla la clase de{" "}
            {instrument.name.toLowerCase()} y todo lo que puedes aprender.
          </p>
        </header>

        <div className="instrument-details__list">
          <article className="instrument-detail">
            <figure className="instrument-detail__photo">
              <img
                src={instrument.lessonImage}
                alt={getInstrumentPhotoAlt(instrument)}
                loading="lazy"
                decoding="async"
              />
              <figcaption>
                {instrument.photoCredit === "PROMUSIC EC"
                  ? "Imagen proporcionada por PROMUSIC EC"
                  : `Foto: ${instrument.photoCredit} · Unsplash`}
              </figcaption>
              <span>{instrument.code}</span>
            </figure>

            <div className="instrument-detail__content">
              <p className="eyebrow">Programa de {instrument.name}</p>
              <h3>{instrument.name}</h3>
              <p className="instrument-detail__description">
                {instrument.detail}
              </p>

              <div className="instrument-detail__meta">
                <span>{instrument.age}</span>
                <span>{instrument.level}</span>
                <span>{instrument.classStyle}</span>
              </div>

              <div className="instrument-detail__learning">
                <small>Lo que aprenderás</small>
                <ul>
                  {instrument.learning.map((item, learningIndex) => (
                    <li key={item}>
                      <span>0{learningIndex + 1}</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="instrument-detail__actions">
                <Button href="/reservar">Agendar clase de prueba</Button>
                <button type="button" onClick={onClose}>
                  Cerrar información
                </button>
              </div>
            </div>
          </article>
        </div>
      </div>
    </section>
  )
}

function BenefitsSection() {
  return (
    <section className="benefits">
      <div className="container">
        <SectionHeading
          eyebrow="La experiencia PROMUSIC"
          title="Mucho más que aprender música."
          light
        />
        <div className="benefits__grid">
          {benefits.map((benefit) => (
            <article className="benefit" key={benefit.number}>
              <span className="benefit__number">{benefit.number}</span>
              <div className="benefit__icon">
                <Icon name={benefit.icon} size={28} />
              </div>
              <h3>{benefit.title}</h3>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}

function PaymentPanel() {
  const [accountsVisible, setAccountsVisible] = useState(false)
  const [payerName, setPayerName] = useState("")
  const [payerEmail, setPayerEmail] = useState("")
  const [amount, setAmount] = useState("")
  const [proofFile, setProofFile] = useState<File | null>(null)
  const [uploadingProof, setUploadingProof] = useState(false)
  const [paymentMessage, setPaymentMessage] = useState("")
  const [paymentSubmitted, setPaymentSubmitted] = useState(false)
  const [fileInputKey, setFileInputKey] = useState(0)

  const submitPaymentProof = async (
    event: React.FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault()
    setPaymentMessage("")
    setPaymentSubmitted(false)

    if (!proofFile) {
      setPaymentMessage("Selecciona una foto o captura de la transferencia.")
      return
    }

    const extension = paymentProofMimeTypes[proofFile.type]
    if (!extension) {
      setPaymentMessage("Usa una imagen en formato JPG, PNG o WebP.")
      return
    }

    if (proofFile.size > 5 * 1024 * 1024) {
      setPaymentMessage("La imagen no puede superar los 5 MB.")
      return
    }

    setUploadingProof(true)

    try {
      const proofPath = `public/${crypto.randomUUID()}.${extension}`
      const { error: uploadError } = await supabase.storage
        .from("payment-proofs")
        .upload(proofPath, proofFile, {
          cacheControl: "3600",
          contentType: proofFile.type,
          upsert: false,
        })

      if (uploadError) throw uploadError

      const { error: submissionError } = await supabase
        .from("payment_submissions")
        .insert({
          payer_name: payerName.trim(),
          payer_email: payerEmail.trim().toLowerCase(),
          amount: Number(amount),
          proof_path: proofPath,
          status: "pending",
        })

      if (submissionError) {
        throw submissionError
      }

      setPayerName("")
      setPayerEmail("")
      setAmount("")
      setProofFile(null)
      setFileInputKey((key) => key + 1)
      setPaymentSubmitted(true)
      setPaymentMessage("Comprobante enviado. Verificaremos tu transferencia.")
    } catch (error) {
      console.error("No se pudo completar el envío del comprobante:", error)
      setPaymentMessage(getPaymentProofErrorMessage(error))
    } finally {
      setUploadingProof(false)
    }
  }

  return (
    <aside
      className={`payment-panel ${
        accountsVisible ? "payment-panel--open" : ""
      }`}
    >
      <div className="payment-panel__top">
        <span>Transferencia bancaria</span>
        <small>Pago seguro</small>
      </div>

      {accountsVisible ? (
        <a
          className="payment-panel__image"
          href="/assets/promusic-payment-accounts.png"
          target="_blank"
          rel="noreferrer"
          aria-label="Abrir números de cuenta en tamaño completo"
        >
          <img
            src="/assets/promusic-payment-accounts.png"
            alt="Datos bancarios de PROMUSIC EC para realizar pagos por transferencia"
            loading="lazy"
            decoding="async"
          />
          <span>
            Abrir imagen completa <Icon name="arrow" size={17} />
          </span>
        </a>
      ) : (
        <div className="payment-panel__cover">
          <span className="payment-panel__number">04</span>
          <Icon name="music" size={42} />
          <div>
            <strong>
              Datos
              <br />
              bancarios.
            </strong>
            <p>
              Consulta las cuentas disponibles para realizar tu pago por
              transferencia.
            </p>
          </div>
        </div>
      )}

      <button
        className="payment-panel__toggle"
        type="button"
        aria-expanded={accountsVisible}
        onClick={() => setAccountsVisible((visible) => !visible)}
      >
        <span>
          {accountsVisible
            ? "Ocultar números de cuenta"
            : "Ver números de cuenta"}
        </span>
        <Icon name={accountsVisible ? "close" : "arrow"} size={18} />
      </button>
      {accountsVisible && (
        <form className="payment-proof-form" onSubmit={submitPaymentProof}>
          <div className="payment-proof-form__heading">
            <span>¿Ya realizaste el pago?</span>
            <strong>Envía tu comprobante</strong>
          </div>
          <label>
            <span>Nombre de quien realizó la transferencia</span>
            <input
              value={payerName}
              onChange={(event) => setPayerName(event.target.value)}
              autoComplete="name"
              required
            />
          </label>
          <label>
            <span>Correo electrónico</span>
            <input
              type="email"
              value={payerEmail}
              onChange={(event) => setPayerEmail(event.target.value)}
              autoComplete="email"
              required
            />
          </label>
          <label>
            <span>Valor transferido</span>
            <div className="payment-proof-form__amount">
              <small>$</small>
              <input
                type="number"
                min="0.01"
                step="0.01"
                inputMode="decimal"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                required
              />
            </div>
          </label>
          <label className="payment-proof-form__file">
            <span>Foto o captura de la transferencia</span>
            <input
              key={fileInputKey}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(event) =>
                setProofFile(event.target.files?.[0] ?? null)
              }
              required
            />
            <strong>{proofFile ? proofFile.name : "Seleccionar imagen"}</strong>
            <small>JPG, PNG o WebP · Máximo 5 MB</small>
          </label>
          {paymentMessage && (
            <p
              className={`payment-proof-form__message ${
                paymentSubmitted ? "is-success" : ""
              }`}
              role="status"
            >
              {paymentMessage}
            </p>
          )}
          <button
            className="payment-proof-form__submit"
            type="submit"
            disabled={uploadingProof}
          >
            <span>
              {uploadingProof
                ? "Enviando comprobante..."
                : "Enviar para verificación"}
            </span>
            {uploadingProof ? (
              <span className="form-spinner" aria-hidden="true" />
            ) : (
              <Icon name="arrow" size={18} />
            )}
          </button>
        </form>
      )}
      <p className="payment-panel__note">
        Verifica los datos antes de confirmar tu transferencia.
      </p>
    </aside>
  )
}

function PlansSection() {
  return (
    <section className="section plans" id="planes">
      <div className="container">
        <div className="plans__heading">
          <SectionHeading
            eyebrow="Programas mensuales"
            title="Elige tu ritmo"
            description="Avanza a tu manera con acompañamiento cercano y clases enfocadas en ti."
          />
          <div className="enrollment">
            <span>Inscripción</span>
            <strong>$10</strong>
          </div>
        </div>
        <div className="plans__commerce">
          <div className="plans__grid">
            {plans.map((plan) => (
              <article
                className={`plan-card ${
                  plan.featured ? "plan-card--featured" : ""
                }`}
                key={plan.name}
              >
                {plan.featured && (
                  <span className="plan-card__badge">Más elegido</span>
                )}
                <div className="plan-card__top">
                  <span>{plan.name}</span>
                  <small>Mensual</small>
                </div>
                <h3>{plan.hours}</h3>
                <div className="plan-card__price">
                  <sup>$</sup>
                  <strong>{plan.price}</strong>
                  <span>/ mes</span>
                </div>
                <div className="plan-card__line" />
                <p>
                  Clases guiadas para avanzar con técnica, constancia y
                  motivación.
                </p>
                <Button
                  href="/contacto"
                  variant={plan.featured ? "dark" : "primary"}
                >
                  Quiero este plan
                </Button>
              </article>
            ))}
          </div>
          <PaymentPanel />
        </div>
      </div>
    </section>
  )
}

function ServicesSection() {
  return (
    <section className="services" id="servicios">
      <div
        className="services__photo"
        role="img"
        aria-label="Sala de música equipada"
      >
        <div className="services__photo-label">
          <Icon name="music" />
          <span>Un espacio para crear</span>
        </div>
      </div>
      <div className="services__content">
        <SectionHeading
          eyebrow="También en PROMUSIC"
          title="Más formas de crear"
          light
        />
        <div className="services__list">
          {services.map((service) => (
            <article className="service-row" key={service.title}>
              <span className="service-row__number">{service.number}</span>
              <div className="service-row__icon">
                <Icon name={service.icon} size={26} />
              </div>
              <div>
                <h3>{service.title}</h3>
                <p>{service.description}</p>
              </div>
              <Icon name="arrow" />
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}

function TeamSection() {
  return (
    <section className="section team" id="equipo">
      <div className="container">
        <div className="team__intro">
          <SectionHeading
            eyebrow="Personas que inspiran"
            title="Conoce a nuestro equipo"
          />
          <p>
            Nuestro equipo trabaja de manera colaborativa para acompañarte en tu
            proceso musical.
          </p>
        </div>
        <div className="team__grid">
          {siteContent.team.map((member, index) => (
            <article
              className={`team-card ${
                index % 2 === 1 ? "team-card--dark" : ""
              }`}
              key={member.name}
            >
              <div className="team-card__visual">
                <span className="team-card__initials">{member.initials}</span>
                {index % 2 === 0 ? (
                  <div className="team-card__bars" aria-hidden="true">
                    <span />
                    <span />
                    <span />
                    <span />
                    <span />
                  </div>
                ) : (
                  <div className="team-card__circle" aria-hidden="true" />
                )}
              </div>
              <div className="team-card__info">
                <span>{member.number}</span>
                <div>
                  <h3>{member.name}</h3>
                  <p>{member.role}</p>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}

function ProcessSection() {
  return (
    <section className="process">
      <div className="container">
        <SectionHeading
          eyebrow="Tu primer paso"
          title="Así de simple es empezar"
          light
        />
        <div className="process__line">
          {steps.map((step, index) => (
            <article className="process-step" key={step}>
              <span>0{index + 1}</span>
              <div className="process-step__dot" />
              <h3>{step}</h3>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}

function CtaSection() {
  return (
    <section className="cta" id="contacto">
      <div className="cta__rings" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
      <div className="cta__content">
        <p className="eyebrow">Es tu momento</p>
        <h2>
          Tu historia musical
          <br />
          comienza <em>aquí.</em>
        </h2>
        <p>Da el primer paso y descubre todo lo que puedes crear.</p>
        <Button href="/reservar" variant="dark">
          Agenda tu clase
        </Button>
      </div>
    </section>
  )
}

function LocationSection() {
  return (
    <section className="location" id="ubicacion">
      <div className="location__info">
        <div>
          <p className="eyebrow">Visítanos</p>
          <Logo />
        </div>
        <div className="location__address">
          <Icon name="pin" size={28} />
          <p>
            {siteContent.contact.address}
            <br />
            <strong>{siteContent.contact.city}</strong>
          </p>
        </div>
        <a
          href="https://maps.google.com/?q=Calle+Larga+y+Mariano+Cueva+Cuenca+Ecuador"
          target="_blank"
          rel="noreferrer"
        >
          Abrir en Google Maps <Icon name="arrow" size={18} />
        </a>
      </div>
      <div
        className="map"
        aria-label="Mapa referencial de la ubicación de PROMUSIC EC"
      >
        <div className="map__grid" />
        <span className="map__road map__road--one" />
        <span className="map__road map__road--two" />
        <span className="map__road map__road--three" />
        <div className="map__pin">
          <Icon name="music" size={26} />
        </div>
        <p>
          Calle Larga
          <br />
          <strong>PROMUSIC EC</strong>
        </p>
      </div>
    </section>
  )
}

function Footer() {
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer__top">
          <div className="footer__brand">
            <Logo light />
            <p>
              Aprende. Crea.
              <br />
              Vive la música.
            </p>
          </div>
          <div className="footer__nav">
            <p>Navegación</p>
            {navItems.map(([label, to]) => (
              <Link to={to} key={label}>
                {label}
              </Link>
            ))}
            <Link to="/admin/acceso">Administrador</Link>
          </div>
          <div className="footer__contact">
            <p>Encuéntranos</p>
            <address>
              {siteContent.contact.address}
              <br />
              {siteContent.contact.city}
            </address>
            <div className="socials">
              {([
                "instagram",
                "facebook",
                "tiktok",
                "whatsapp",
              ] as IconName[]).map((social) => (
                <Link to="/contacto" aria-label={social} key={social}>
                  <Icon name={social} size={20} />
                </Link>
              ))}
            </div>
          </div>
        </div>
        <div className="footer__bottom">
          <span>© 2026 PROMUSIC EC</span>
          <SupabaseConnectionStatus />
          <span>Música para todos · Desde los 5 años</span>
        </div>
      </div>
    </footer>
  )
}

function ScrollManager() {
  const { pathname, hash } = useLocation()

  useEffect(() => {
    if (hash) {
      requestAnimationFrame(() =>
        document.querySelector(hash)?.scrollIntoView({ behavior: "smooth" }),
      )
      return
    }
    window.scrollTo({ top: 0, behavior: "auto" })
  }, [pathname, hash])

  return null
}

function SiteLayout() {
  const navigation = useNavigation()
  const loading = navigation.state !== "idle"

  return (
    <div className="site-shell" aria-busy={loading}>
      <div
        className={`route-loading ${loading ? "route-loading--active" : ""}`}
        aria-hidden="true"
      />
      <ScrollManager />
      <Header />
      <main>
        <Outlet />
      </main>
      <Footer />
    </div>
  )
}

function PageIntro({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string
  title: string
  description: string
}) {
  return (
    <section className="page-intro">
      <div className="container">
        <SectionHeading
          eyebrow={eyebrow}
          title={title}
          description={description}
          light
        />
      </div>
    </section>
  )
}

function HomePage() {
  return (
    <>
      <HeroSection />
      <Marquee />
      <InstrumentsSection />
      <BenefitsSection />
      <PlansSection />
      <ServicesSection />
      <TeamSection />
      <ProcessSection />
      <CtaSection />
      <LocationSection />
    </>
  )
}

function AboutPage() {
  return (
    <>
      <PageIntro
        eyebrow="PROMUSIC EC"
        title="Nosotros"
        description="Una academia cercana para descubrir, desarrollar y disfrutar el talento musical a cualquier edad."
      />
      <BenefitsSection />
      <ProcessSection />
    </>
  )
}

function InstrumentsPage() {
  const location = useLocation()
  const initialSlug = location.hash.startsWith("#clases-")
    ? location.hash.replace("#clases-", "")
    : null
  const [selectedSlug, setSelectedSlug] = useState<string | null>(
    instruments.some((instrument) => instrument.slug === initialSlug)
      ? initialSlug
      : null,
  )
  const selectedInstrument = instruments.find(
    (instrument) => instrument.slug === selectedSlug,
  )

  useEffect(() => {
    if (!location.hash.startsWith("#clases-")) return
    const slug = location.hash.replace("#clases-", "")
    if (instruments.some((instrument) => instrument.slug === slug))
      setSelectedSlug(slug)
  }, [location.hash])

  useEffect(() => {
    if (!selectedSlug) return
    requestAnimationFrame(() => {
      document
        .getElementById(`clases-${selectedSlug}`)
        ?.scrollIntoView({ behavior: "smooth", block: "start" })
    })
  }, [selectedSlug])

  const selectInstrument = (instrument: Instrument) => {
    setSelectedSlug(instrument.slug)
    window.history.replaceState(
      null,
      "",
      `/instrumentos#clases-${instrument.slug}`,
    )
  }

  const closeInstrument = () => {
    setSelectedSlug(null)
    window.history.replaceState(null, "", "/instrumentos")
    document
      .getElementById("instrumentos")
      ?.scrollIntoView({ behavior: "smooth", block: "start" })
  }

  return (
    <div className="route-page">
      <InstrumentsSection
        onSelectInstrument={selectInstrument}
        selectedSlug={selectedSlug}
      />
      {selectedInstrument && (
        <InstrumentDetailsSection
          instrument={selectedInstrument}
          onClose={closeInstrument}
        />
      )}
    </div>
  )
}

function ProgramsPage() {
  return (
    <>
      <PageIntro
        eyebrow="Aprende a tu ritmo"
        title="Programas"
        description="Clases para niños, jóvenes y adultos, desde nivel inicial y con acompañamiento cercano."
      />
      <InstrumentsSection />
    </>
  )
}

function PlansPage() {
  return (
    <div className="route-page">
      <PlansSection />
    </div>
  )
}

function ServicesPage() {
  return (
    <div className="route-page route-page--dark">
      <ServicesSection />
    </div>
  )
}

function TeamPage() {
  return (
    <div className="route-page">
      <TeamSection />
    </div>
  )
}

function ContactPage() {
  return (
    <>
      <CtaSection />
      <LocationSection />
    </>
  )
}

function getReservationErrors(
  step: number,
  data: TrialRequest,
): TrialRequestErrors {
  const errors: TrialRequestErrors = {}

  if (step === 0) {
    if (data.firstName.trim().length < 2)
      errors.firstName = "Ingresa el nombre del estudiante."
    if (data.lastName.trim().length < 2)
      errors.lastName = "Ingresa el apellido del estudiante."

    const age = Number(data.age)
    if (!data.age) errors.age = "Ingresa la edad del estudiante."
    else if (!Number.isInteger(age) || age < 5 || age > 100)
      errors.age = "Ingresa una edad válida desde los 5 años."

    const phoneDigits = data.phone.replace(/\D/g, "")
    if (!data.phone.trim()) errors.phone = "Ingresa un número de teléfono."
    else if (phoneDigits.length < 7 || phoneDigits.length > 15)
      errors.phone = "Ingresa un teléfono válido."

    if (!data.email.trim()) errors.email = "Ingresa un correo electrónico."
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email))
      errors.email = "Ingresa un correo electrónico válido."
  }

  if (step === 1 && !data.instrument)
    errors.instrument = "Selecciona un instrumento."
  if (step === 2 && !data.modality)
    errors.modality = "Selecciona una modalidad."
  if (step === 3) {
    if (!data.bookingDate) {
      errors.bookingDate = "Selecciona la fecha de la clase."
    } else if (data.bookingDate < getLocalDateInputValue()) {
      errors.bookingDate = "La fecha de la clase no puede estar en el pasado."
    }

    if (!data.bookingTime)
      errors.bookingTime = "Selecciona un horario disponible."
  }

  return errors
}

function ReservationForm() {
  const [currentStep, setCurrentStep] = useState(0)
  const [data, setData] = useState<TrialRequest>(emptyTrialRequest)
  const [errors, setErrors] = useState<TrialRequestErrors>({})
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [submissionError, setSubmissionError] = useState("")
  const [bookedTimes, setBookedTimes] = useState<string[]>([])
  const [slotsLoading, setSlotsLoading] = useState(false)
  const [slotsError, setSlotsError] = useState("")
  const [slotsLoadFailed, setSlotsLoadFailed] = useState(false)

  const updateField = (field: keyof TrialRequest, value: string) => {
    setData((current) => ({ ...current, [field]: value }))
    setErrors((current) => ({ ...current, [field]: undefined }))
  }

  const loadBookedSlots = useCallback(
    async (bookingDate: string, instrument: string) => {
      if (!bookingDate || !instrument) {
        setBookedTimes([])
        setSlotsLoadFailed(false)
        return
      }

      setSlotsLoading(true)
      setSlotsError("")
      setSlotsLoadFailed(false)

      const { data: occupiedSlots, error } = await supabase
        .from("booked_slots")
        .select("booking_time")
        .eq("booking_date", bookingDate)
        .eq("instrument", instrument)

      if (error) {
        console.error("Supabase no pudo consultar los horarios ocupados:", {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint,
        })
        setBookedTimes([])
        setSlotsLoadFailed(true)
        setSlotsError(
          "No pudimos consultar la disponibilidad. Inténtalo nuevamente.",
        )
      } else {
        const normalizedTimes = (occupiedSlots ?? [])
          .map((slot) =>
            typeof slot.booking_time === "string"
              ? slot.booking_time.slice(0, 5)
              : "",
          )
          .filter(Boolean)
        setBookedTimes(normalizedTimes)
        setSlotsLoadFailed(false)
        setData((current) =>
          normalizedTimes.includes(current.bookingTime)
            ? { ...current, bookingTime: "" }
            : current,
        )
      }

      setSlotsLoading(false)
    },
    [],
  )

  useEffect(() => {
    if (!data.bookingDate || !data.instrument) {
      setBookedTimes([])
      return
    }

    void loadBookedSlots(data.bookingDate, data.instrument)
  }, [data.bookingDate, data.instrument, loadBookedSlots])

  const continueToNextStep = () => {
    const stepErrors = getReservationErrors(currentStep, data)
    if (Object.keys(stepErrors).length > 0) {
      setErrors(stepErrors)
      return
    }
    setErrors({})
    setCurrentStep((step) => Math.min(step + 1, reservationSteps.length - 1))
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const allErrors = [0, 1, 2, 3].reduce<TrialRequestErrors>(
      (result, step) => ({ ...result, ...getReservationErrors(step, data) }),
      {},
    )

    if (Object.keys(allErrors).length > 0) {
      setErrors(allErrors)
      const firstInvalidStep =
        allErrors.firstName ||
        allErrors.lastName ||
        allErrors.age ||
        allErrors.phone ||
        allErrors.email
          ? 0
          : allErrors.instrument
            ? 1
            : allErrors.modality
              ? 2
              : 3
      setCurrentStep(firstInvalidStep)
      return
    }

    setSubmitting(true)
    setSubmissionError("")
    try {
      await submitTrialRequest(data)
      setSubmitted(true)
    } catch (error) {
      if (error instanceof BookingInsertError && error.code === "23505") {
        const conflictMessage =
          "Ese horario acaba de ser reservado. Elige otro."
        setData((current) => ({ ...current, bookingTime: "" }))
        setCurrentStep(3)
        await loadBookedSlots(data.bookingDate, data.instrument)
        setSlotsError(conflictMessage)
      } else {
        const message =
          error instanceof Error
            ? error.message
            : "No pudimos enviar tu solicitud. Inténtalo nuevamente."
        setSubmissionError(`No se pudo guardar la solicitud: ${message}`)
      }
    } finally {
      setSubmitting(false)
    }
  }

  if (submitted) {
    const whatsappMessage = encodeURIComponent(
      "Hola PROMUSIC EC, acabo de solicitar una clase de prueba desde su sitio web.",
    )

    return (
      <section className="reservation reservation--success" aria-live="polite">
        <div className="reservation-success">
          <div className="reservation-success__mark" aria-hidden="true">
            <Icon name="music" size={34} />
          </div>
          <p className="eyebrow">Solicitud completada</p>
          <h2>¡Solicitud recibida!</h2>
          <p>
            Gracias por confiar en PROMUSIC EC.
            <br />
            Nuestro equipo se pondrá en contacto contigo
            <br />
            para coordinar tu clase de prueba.
          </p>
          <a
            className="button button--dark"
            href={`https://wa.me/?text=${whatsappMessage}`}
            target="_blank"
            rel="noreferrer"
          >
            <span>Escribir por WhatsApp</span>
            <Icon name="whatsapp" size={20} />
          </a>
        </div>
      </section>
    )
  }

  return (
    <section className="reservation">
      <div className="container">
        <div className="reservation__layout">
          <aside className="reservation__aside">
            <p className="eyebrow">Solicitud de clase</p>
            <h2>Da el primer paso.</h2>
            <p>
              Completa tus preferencias y nuestro equipo te contactará para
              coordinar los detalles.
            </p>
            <div className="reservation__contact">
              <Icon name="pin" size={20} />
              <span>{siteContent.contact.shortLocation}</span>
            </div>
          </aside>

          <form className="reservation-form" onSubmit={handleSubmit} noValidate>
            <ol
              className="reservation-progress"
              aria-label="Progreso de la solicitud"
            >
              {reservationSteps.map((label, index) => (
                <li
                  className={
                    index < currentStep
                      ? "is-complete"
                      : index === currentStep
                        ? "is-active"
                        : ""
                  }
                  key={label}
                >
                  <button
                    type="button"
                    disabled={index >= currentStep}
                    aria-current={index === currentStep ? "step" : undefined}
                    onClick={() => {
                      setErrors({})
                      setCurrentStep(index)
                    }}
                  >
                    <span>0{index + 1}</span>
                    <small>{label}</small>
                  </button>
                </li>
              ))}
            </ol>

            <div className="reservation-form__body">
              <div className="reservation-form__heading">
                <span>Paso 0{currentStep + 1} de 05</span>
                <h3>{reservationSteps[currentStep]}</h3>
              </div>

              {currentStep === 0 && (
                <fieldset className="form-step">
                  <legend className="sr-only">Datos del estudiante</legend>
                  <div className="form-grid">
                    <label className="form-field">
                      <span>Nombre</span>
                      <input
                        autoComplete="given-name"
                        value={data.firstName}
                        aria-invalid={Boolean(errors.firstName)}
                        aria-describedby={
                          errors.firstName ? "firstName-error" : undefined
                        }
                        onChange={(event) =>
                          updateField("firstName", event.target.value)
                        }
                      />
                      {errors.firstName && (
                        <small className="form-error" id="firstName-error">
                          {errors.firstName}
                        </small>
                      )}
                    </label>
                    <label className="form-field">
                      <span>Apellido</span>
                      <input
                        autoComplete="family-name"
                        value={data.lastName}
                        aria-invalid={Boolean(errors.lastName)}
                        aria-describedby={
                          errors.lastName ? "lastName-error" : undefined
                        }
                        onChange={(event) =>
                          updateField("lastName", event.target.value)
                        }
                      />
                      {errors.lastName && (
                        <small className="form-error" id="lastName-error">
                          {errors.lastName}
                        </small>
                      )}
                    </label>
                    <label className="form-field form-field--age">
                      <span>Edad</span>
                      <input
                        type="number"
                        min="5"
                        max="100"
                        inputMode="numeric"
                        value={data.age}
                        aria-invalid={Boolean(errors.age)}
                        aria-describedby={errors.age ? "age-error" : undefined}
                        onChange={(event) =>
                          updateField("age", event.target.value)
                        }
                      />
                      {errors.age && (
                        <small className="form-error" id="age-error">
                          {errors.age}
                        </small>
                      )}
                    </label>
                    <label className="form-field">
                      <span>Teléfono</span>
                      <input
                        type="tel"
                        autoComplete="tel"
                        inputMode="tel"
                        value={data.phone}
                        aria-invalid={Boolean(errors.phone)}
                        aria-describedby={
                          errors.phone ? "phone-error" : undefined
                        }
                        onChange={(event) =>
                          updateField("phone", event.target.value)
                        }
                      />
                      {errors.phone && (
                        <small className="form-error" id="phone-error">
                          {errors.phone}
                        </small>
                      )}
                    </label>
                    <label className="form-field form-field--wide">
                      <span>Correo electrónico</span>
                      <input
                        type="email"
                        autoComplete="email"
                        value={data.email}
                        aria-invalid={Boolean(errors.email)}
                        aria-describedby={
                          errors.email ? "email-error" : undefined
                        }
                        onChange={(event) =>
                          updateField("email", event.target.value)
                        }
                      />
                      {errors.email && (
                        <small className="form-error" id="email-error">
                          {errors.email}
                        </small>
                      )}
                    </label>
                  </div>
                </fieldset>
              )}

              {currentStep === 1 && (
                <fieldset className="form-step">
                  <legend className="sr-only">Selecciona un instrumento</legend>
                  <div className="choice-grid choice-grid--instruments">
                    {instrumentOptions.map((instrument, index) => (
                      <label
                        className={`choice-card ${
                          data.instrument === instrument ? "is-selected" : ""
                        }`}
                        key={instrument}
                      >
                        <input
                          type="radio"
                          name="instrument"
                          value={instrument}
                          checked={data.instrument === instrument}
                          onChange={(event) => {
                            if (data.bookingDate) setSlotsLoading(true)
                            updateField("instrument", event.target.value)
                            updateField("bookingTime", "")
                          }}
                        />
                        <span className="choice-card__number">
                          0{index + 1}
                        </span>
                        <Icon name="music" size={24} />
                        <strong>{instrument}</strong>
                      </label>
                    ))}
                  </div>
                  {errors.instrument && (
                    <p className="form-error form-error--group">
                      {errors.instrument}
                    </p>
                  )}
                </fieldset>
              )}

              {currentStep === 2 && (
                <fieldset className="form-step">
                  <legend className="sr-only">Selecciona una modalidad</legend>
                  <div className="choice-grid choice-grid--two">
                    {modalityOptions.map((modality, index) => (
                      <label
                        className={`choice-card choice-card--large ${
                          data.modality === modality ? "is-selected" : ""
                        }`}
                        key={modality}
                      >
                        <input
                          type="radio"
                          name="modality"
                          value={modality}
                          checked={data.modality === modality}
                          onChange={(event) =>
                            updateField("modality", event.target.value)
                          }
                        />
                        <span className="choice-card__number">
                          0{index + 1}
                        </span>
                        <Icon
                          name={index === 0 ? "spark" : "users"}
                          size={30}
                        />
                        <strong>{modality}</strong>
                      </label>
                    ))}
                  </div>
                  {errors.modality && (
                    <p className="form-error form-error--group">
                      {errors.modality}
                    </p>
                  )}
                </fieldset>
              )}

              {currentStep === 3 && (
                <fieldset className="form-step">
                  <legend className="sr-only">
                    Selecciona la fecha y el horario de preferencia
                  </legend>
                  <label className="form-field schedule-date-field">
                    <span>Fecha de la clase</span>
                    <input
                      type="date"
                      min={getLocalDateInputValue()}
                      value={data.bookingDate}
                      aria-invalid={Boolean(errors.bookingDate)}
                      aria-describedby={
                        errors.bookingDate ? "bookingDate-error" : undefined
                      }
                      onChange={(event) => {
                        setSlotsLoading(Boolean(event.target.value))
                        updateField("bookingDate", event.target.value)
                        updateField("bookingTime", "")
                      }}
                    />
                    {errors.bookingDate && (
                      <small className="form-error" id="bookingDate-error">
                        {errors.bookingDate}
                      </small>
                    )}
                  </label>
                  <div className="reservation-slots__heading">
                    <span>Horarios disponibles</span>
                    {slotsLoading && (
                      <small>Consultando disponibilidad...</small>
                    )}
                  </div>
                  {!data.bookingDate || !data.instrument ? (
                    <div className="reservation-slots__empty">
                      Selecciona una fecha y un instrumento para consultar
                      horarios.
                    </div>
                  ) : slotsLoading ? (
                    <div className="reservation-slots__empty">
                      Consultando los horarios disponibles...
                    </div>
                  ) : (
                    <div className="choice-grid choice-grid--slots">
                      {hourlySlots.map((bookingTime, index) => {
                        const occupied = bookedTimes.includes(bookingTime)
                        const unavailable = occupied || slotsLoadFailed

                        return (
                          <label
                            className={[
                              "choice-card",
                              "choice-card--slot",
                              data.bookingTime === bookingTime
                                ? "is-selected"
                                : "",
                              occupied ? "is-unavailable" : "",
                            ]
                              .filter(Boolean)
                              .join(" ")}
                            key={bookingTime}
                          >
                            <input
                              type="radio"
                              name="bookingTime"
                              value={bookingTime}
                              checked={data.bookingTime === bookingTime}
                              disabled={unavailable}
                              onChange={(event) =>
                                updateField("bookingTime", event.target.value)
                              }
                            />
                            <span className="choice-card__number">
                              0{index + 1}
                            </span>
                            <Icon name="clock" size={30} />
                            <strong>{bookingTime}</strong>
                            <small>{occupied ? "Ocupado" : "Disponible"}</small>
                          </label>
                        )
                      })}
                    </div>
                  )}
                  {slotsError && (
                    <p
                      className="form-error form-error--submission"
                      role="alert"
                    >
                      {slotsError}
                    </p>
                  )}
                  {errors.bookingTime && (
                    <p className="form-error form-error--group">
                      {errors.bookingTime}
                    </p>
                  )}
                </fieldset>
              )}

              {currentStep === 4 && (
                <div className="form-step">
                  <div className="reservation-summary">
                    <div className="reservation-summary__student">
                      <span>Estudiante</span>
                      <strong>
                        {data.firstName} {data.lastName}
                      </strong>
                      <small>{data.age} años</small>
                    </div>
                    <dl>
                      <div>
                        <dt>Teléfono</dt>
                        <dd>{data.phone}</dd>
                      </div>
                      <div>
                        <dt>Correo electrónico</dt>
                        <dd>{data.email}</dd>
                      </div>
                      <div>
                        <dt>Instrumento</dt>
                        <dd>{data.instrument}</dd>
                      </div>
                      <div>
                        <dt>Modalidad</dt>
                        <dd>{data.modality}</dd>
                      </div>
                      <div>
                        <dt>Fecha</dt>
                        <dd>{data.bookingDate}</dd>
                      </div>
                      <div>
                        <dt>Horario</dt>
                        <dd>{data.bookingTime}</dd>
                      </div>
                    </dl>
                  </div>
                  <p className="reservation-summary__note">
                    Revisaremos tu solicitud y te contactaremos para confirmar
                    disponibilidad y coordinar la clase.
                  </p>
                  {submissionError && (
                    <p
                      className="form-error form-error--submission"
                      role="alert"
                    >
                      {submissionError}
                    </p>
                  )}
                </div>
              )}

              <div className="reservation-form__actions">
                {currentStep > 0 && (
                  <button
                    className="form-back"
                    type="button"
                    disabled={submitting}
                    onClick={() => {
                      setErrors({})
                      setCurrentStep((step) => step - 1)
                    }}
                  >
                    Volver
                  </button>
                )}
                {currentStep < reservationSteps.length - 1 ? (
                  <button
                    className="button button--primary form-next"
                    type="button"
                    onClick={continueToNextStep}
                  >
                    <span>Continuar</span>
                    <Icon name="arrow" size={19} />
                  </button>
                ) : (
                  <button
                    className="button button--primary form-next"
                    type="submit"
                    disabled={submitting}
                  >
                    <span>
                      {submitting
                        ? "Enviando solicitud..."
                        : "Solicitar clase de prueba"}
                    </span>
                    {submitting ? (
                      <span className="form-spinner" aria-hidden="true" />
                    ) : (
                      <Icon name="arrow" size={19} />
                    )}
                  </button>
                )}
              </div>
            </div>
          </form>
        </div>
      </div>
    </section>
  )
}

function ReservationPage() {
  return (
    <>
      <PageIntro
        eyebrow="Agenda tu clase"
        title="Comienza tu historia musical"
        description="Solicita una clase de prueba y descubre el programa ideal para ti."
      />
      <ReservationForm />
      <LocationSection />
    </>
  )
}

function NotFoundPage() {
  return (
    <PageIntro
      eyebrow="404"
      title="Página no encontrada"
      description="La página que buscas no existe o cambió de ubicación."
    />
  )
}

const router = createBrowserRouter([
  {
    path: "/",
    Component: SiteLayout,
    children: [
      { index: true, Component: HomePage },
      { path: "nosotros", Component: AboutPage },
      { path: "instrumentos", Component: InstrumentsPage },
      { path: "programas", Component: ProgramsPage },
      { path: "planes", Component: PlansPage },
      { path: "servicios", Component: ServicesPage },
      { path: "equipo", Component: TeamPage },
      { path: "contacto", Component: ContactPage },
      { path: "reservar", Component: ReservationPage },
      { path: "admin", Component: AdminPage },
      { path: "admin/acceso", Component: AdminLoginPage },
      { path: "*", Component: NotFoundPage },
    ],
  },
])

function App() {
  return <RouterProvider router={router} />
}

export default App
