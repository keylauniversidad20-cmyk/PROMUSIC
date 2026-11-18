import { useState } from "react";
import { supabaseAnonKey, supabaseUrl } from "./supabaseConfig";

type CheckState = "idle" | "checking" | "connected" | "unconfigured" | "error" | "table-error" | "permission-error";

type CheckResult = {
  state: CheckState;
  label: string;
  message: string;
  httpStatus?: number;
};

const idleResult: CheckResult = {
  state: "idle",
  label: "Sin comprobar",
  message: "",
};

function getConfigurationError(): string | null {
  if (!supabaseUrl) return "Falta VITE_SUPABASE_URL.";
  if (!supabaseAnonKey) return "Falta VITE_SUPABASE_ANON_KEY.";

  try {
    const parsedUrl = new URL(supabaseUrl);
    if (parsedUrl.protocol !== "https:" || !parsedUrl.hostname.endsWith(".supabase.co")) {
      return "La URL configurada para Supabase no es válida.";
    }
  } catch {
    return "La URL configurada para Supabase no es válida.";
  }

  if (supabaseAnonKey.startsWith("sb_secret_")) {
    return "La clave configurada es secreta. Configura una clave pública; nunca uses service_role en el navegador.";
  }

  if (supabaseAnonKey.split(".").length === 3) {
    try {
      const base64Payload = supabaseAnonKey.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
      const paddedPayload = base64Payload.padEnd(Math.ceil(base64Payload.length / 4) * 4, "=");
      const payload = JSON.parse(atob(paddedPayload));
      if (payload.role === "service_role") {
        return "La clave configurada es service_role. Debe reemplazarse por una clave pública antes de probar desde el navegador.";
      }
    } catch {
      return "La clave pública configurada no tiene un formato válido.";
    }
  } else if (!supabaseAnonKey.startsWith("sb_publishable_")) {
    return "La clave pública configurada no tiene un formato reconocido.";
  }

  return null;
}

async function readSupabaseError(response: Response) {
  try {
    const body = await response.json() as Record<string, unknown>;
    return {
      code: typeof body.code === "string" ? body.code : "",
      message:
        (typeof body.message === "string" && body.message) ||
        (typeof body.msg === "string" && body.msg) ||
        (typeof body.error === "string" && body.error) ||
        response.statusText ||
        "Supabase rechazó la solicitud.",
    };
  } catch {
    return {
      code: "",
      message: response.statusText || "Supabase rechazó la solicitud.",
    };
  }
}

function classifyHttpError(status: number, code: string, rawMessage: string): CheckResult {
  const message = rawMessage.toLowerCase();
  const missingTable =
    code === "PGRST204" ||
    code === "PGRST205" ||
    message.includes("relation") && message.includes("does not exist") ||
    message.includes("table") && message.includes("not found");

  if (missingTable) {
    return {
      state: "table-error",
      label: "Tabla no disponible",
      message: "Supabase respondió, pero la tabla consultada no existe o no está expuesta por la API REST.",
      httpStatus: status,
    };
  }

  const permissionDenied =
    status === 403 ||
    code === "42501" ||
    message.includes("row-level security") ||
    message.includes("permission denied") ||
    message.includes("policy");

  if (permissionDenied) {
    return {
      state: "permission-error",
      label: "Permiso denegado",
      message: "Supabase respondió, pero las políticas RLS o los permisos impiden completar la consulta.",
      httpStatus: status,
    };
  }

  if (status === 401 && message.includes("invalid api key")) {
    return {
      state: "error",
      label: "Error de conexión",
      message: "Supabase rechazó la clave pública configurada. Vuelve a conectar el proyecto o actualiza su clave pública.",
      httpStatus: status,
    };
  }

  return {
    state: "error",
    label: "Error de conexión",
    message: rawMessage || "Supabase respondió con un error.",
    httpStatus: status,
  };
}

export default function SupabaseConnectionStatus() {
  const [expanded, setExpanded] = useState(false);
  const [result, setResult] = useState<CheckResult>(idleResult);

  const checkConnection = async () => {
    setExpanded(true);

    const configurationError = getConfigurationError();
    if (configurationError) {
      setResult({
        state: "unconfigured",
        label: "Sin configurar",
        message: configurationError,
      });
      return;
    }

    setResult({
      state: "checking",
      label: "Comprobando conexión",
      message: "Validando la comunicación con Supabase mediante una solicitud real de solo lectura.",
    });

    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 12000);

    try {
      const response = await fetch(`${supabaseUrl}/rest/v1/`, {
        method: "GET",
        headers: {
          Accept: "application/openapi+json",
          apikey: supabaseAnonKey,
          Authorization: `Bearer ${supabaseAnonKey}`,
        },
        cache: "no-store",
        signal: controller.signal,
      });

      if (response.ok) {
        await response.body?.cancel();
        setResult({
          state: "connected",
          label: "Conectado",
          message: "Supabase aceptó la clave pública y respondió correctamente a la solicitud REST de solo lectura.",
          httpStatus: response.status,
        });
        return;
      }

      const error = await readSupabaseError(response);
      setResult(classifyHttpError(response.status, error.code, error.message));
    } catch (error) {
      const timedOut = error instanceof DOMException && error.name === "AbortError";
      setResult({
        state: "error",
        label: "Error de conexión",
        message: timedOut
          ? "La comprobación superó el tiempo de espera. Verifica la red y la disponibilidad del proyecto."
          : "No fue posible comunicarse con Supabase. Verifica la red, la URL del proyecto y la configuración CORS.",
      });
    } finally {
      window.clearTimeout(timeout);
    }
  };

  return (
    <div className={`supabase-status ${expanded ? "supabase-status--expanded" : ""}`}>
      <button className="supabase-status__trigger" type="button" onClick={checkConnection} disabled={result.state === "checking"}>
        Estado de conexión con Supabase
      </button>

      {expanded && (
        <div className="supabase-status__panel" aria-live="polite" aria-atomic="true">
          <div className="supabase-status__result">
            <span className={`supabase-status__dot supabase-status__dot--${result.state}`} aria-hidden="true" />
            <div>
              <strong>{result.label}</strong>
              <p>{result.message}</p>
              {result.httpStatus && <small>Código HTTP: {result.httpStatus}</small>}
            </div>
          </div>
          <button
            className="supabase-status__retry"
            type="button"
            onClick={checkConnection}
            disabled={result.state === "checking"}
          >
            {result.state === "checking" ? "Comprobando..." : "Volver a comprobar"}
          </button>
        </div>
      )}
    </div>
  );
}
