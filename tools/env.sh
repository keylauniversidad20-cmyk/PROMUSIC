# Uso:  source tools/env.sh   (desde la raíz del proyecto)
# Agrega el CLI de Supabase del proyecto al PATH de esta terminal.
export PATH="$(cd "$(dirname "${BASH_SOURCE[0]:-$0}")" && pwd)/bin:$PATH"
