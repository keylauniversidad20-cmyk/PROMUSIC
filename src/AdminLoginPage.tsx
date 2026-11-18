import { useEffect, useState, type FormEvent } from "react";
import { useNavigate } from "react-router";
import { supabase } from "./supabaseClient";
import "./admin.css";

async function isAdministrator(userId: string) {
  const { data, error } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .maybeSingle();

  return !error && data?.role === "administrador";
}

export default function AdminLoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let active = true;

    supabase.auth.getSession().then(async ({ data }) => {
      if (!active || !data.session) return;
      const allowed = await isAdministrator(data.session.user.id);
      if (!active) return;
      navigate(allowed ? "/admin" : "/", { replace: true });
    });

    return () => {
      active = false;
    };
  }, [navigate]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setErrorMessage("");

    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });

    if (error || !data.user) {
      setErrorMessage("No pudimos iniciar sesión. Revisa tus credenciales.");
      setSubmitting(false);
      return;
    }

    const allowed = await isAdministrator(data.user.id);
    if (!allowed) {
      await supabase.auth.signOut();
      navigate("/", { replace: true });
      return;
    }

    navigate("/admin", { replace: true });
  };

  return (
    <section className="admin-login">
      <div className="admin-login__grain" aria-hidden="true" />
      <div className="admin-login__card">
        <p className="eyebrow">PROMUSIC EC · ADMINISTRACIÓN</p>
        <h1>Acceso<br /><em>privado.</em></h1>
        <p>Ingresa con tu cuenta administrativa para gestionar las reservas y la comunidad PROMUSIC.</p>

        <form onSubmit={handleSubmit}>
          <label>
            <span>Correo electrónico</span>
            <input
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </label>
          <label>
            <span>Contraseña</span>
            <input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </label>
          {errorMessage && <p className="admin-login__error" role="alert">{errorMessage}</p>}
          <button className="admin-primary-button" type="submit" disabled={submitting}>
            {submitting ? "Verificando..." : "Ingresar al panel"}
            <span aria-hidden="true">→</span>
          </button>
        </form>
      </div>
    </section>
  );
}
