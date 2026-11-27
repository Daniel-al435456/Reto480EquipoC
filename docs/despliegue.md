<sub>[Inicio](../README.md) · [Especificación](../SPEC.md) · [Bitácora](../BITACORA.md) · [Decisiones](decisiones.md) · [Contribución](../CONTRIBUTING.md)</sub>

# Despliegue

Cómo publicar la aplicación con cuentas propias en los planes gratuitos de Supabase, Render y Netlify. Cualquier miembro del equipo puede seguir estos pasos con sus cuentas; las plantillas están en el repositorio (`render.yaml` y `netlify.toml`) y los secretos solo se escriben en cada servicio.

| Parte | Servicio | Plantilla |
|---|---|---|
| Base de datos (PostgreSQL) | Supabase | Migraciones de `backend/migraciones/` |
| Backend (FastAPI) | Render | `render.yaml` |
| Frontend (PWA) | Netlify | `netlify.toml` |

El orden importa: primero la base de datos, después el backend, que necesita su dirección, y por último el frontend, que necesita la del backend. Al final se vuelve a Render para indicar la dirección del frontend.

---

## 1. Antes de empezar

- Cuentas en [Supabase](https://supabase.com), [Render](https://render.com) y [Netlify](https://www.netlify.com). Las tres permiten entrar con GitHub.
- En el ordenador, el repositorio clonado y PostgreSQL instalado (solo se usa `psql`, para cargar la base de datos). Ver `backend/README.md`.
- **Repositorio que se despliega.** Render y Netlify necesitan permiso sobre el repositorio, y ese permiso solo lo puede dar su propietario. Quien no lo sea despliega desde una copia propia: en GitHub, **Fork** en la página del repositorio. Para que la copia se actualice sola, ver el [apartado 6](#6-mantener-la-copia-al-día).

## 2. Base de datos en Supabase

1. **New project.** Nombre `reto480`, una contraseña segura (guárdala: se usa en los pasos siguientes) y la región más cercana, por ejemplo *Central EU (Frankfurt)*.
2. **Desactivar la Data API.** La aplicación se conecta a PostgreSQL directamente y no usa la API automática de Supabase. Sin desactivarla, las tablas del esquema `public` podrían quedar accesibles desde esa API. Se puede desmarcar al crear el proyecto o, después, en *Project Settings → Data API*.
3. **Cadena de conexión.** En el botón **Connect** del proyecto, elegir **Session pooler** (puerto 5432), no la *Direct connection*: en el plan gratuito, la conexión directa solo funciona por IPv6, y Render no la admite. Tiene esta forma:

   ```
   postgresql://USUARIO:CONTRASEÑA@SERVIDOR:5432/postgres
   ```

   - El usuario es `postgres.` seguido de la referencia del proyecto, y el servidor, del tipo `aws-0-eu-central-1.pooler.supabase.com`. Conviene copiarlos con los botones de *Connection parameters* y no escribirlos a mano: una letra cambiada da el error `tenant/user ... not found`.
   - La contraseña es la que se eligió al crear el proyecto: en la cadena va entre los dos puntos y la arroba. Si se ha perdido, o si se ha compartido por error, se crea otra con **Reset database password**. Es más cómodo que tenga solo letras y números: los símbolos como `@`, `#`, `/` o `:` rompen la cadena.

4. **Crear las tablas y cargar el curso**, desde `backend/` en el ordenador. Los scripts usan las variables estándar de PostgreSQL; la contraseña se pide sin mostrarla, para que no quede en el historial de la terminal:

   ```bash
   cd backend
   export PGHOST=aws-0-eu-central-1.pooler.supabase.com PGPORT=5432
   export PGUSER=postgres.REFERENCIA PGDATABASE=postgres
   read -rs PGPASSWORD && export PGPASSWORD   # escribe la contraseña y pulsa Intro
   ./migraciones/aplicar.sh
   ./migraciones/cargar_curso.sh
   ```

   Tiene que terminar con "Aplicada: …" por cada migración y "Curso cargado en postgres". Cada vez que cambie el curso o haya una migración nueva, se repiten estos dos comandos.

5. Comprobar en **Table Editor** que `lecciones` tiene filas.

## 3. Backend en Render

Si Render no muestra el repositorio, hay que darle acceso en GitHub: *Settings → Applications → Render → Configure* y añadirlo en *Repository access*. Lo mismo vale para Netlify.

1. **New → Blueprint** y elegir el repositorio (o la copia). Render lee `render.yaml` y propone el servicio `reto480-api`.

   También se puede crear a mano con **New → Web Service**: *Language* Python 3, región Frankfurt, *Root Directory* `backend`, *Build Command* `pip install .`, *Start Command* `uvicorn app.main:app --host 0.0.0.0 --port $PORT`, plan gratuito, la variable `PYTHON_VERSION` = `3.12.8` y, en *Advanced*, *Health Check Path* `/salud`. Así no hace falta que `render.yaml` esté en la rama elegida.
2. Rellenar las variables que pide:
   - `DATABASE_URL`: la cadena del *Session pooler* del paso 2.3, con la contraseña en lugar de `CONTRASEÑA`.
   - `FRONTEND_URL`: de momento, `http://localhost:5173`. Se cambia en el paso 4.4.
   - `GROQ_API_KEY`: la clave de Groq de quien despliega (se crea gratis en la consola de Groq). Sin ella, el diagnóstico, el mentor y la corrección usan sus respuestas de respaldo. Ver [cómo funciona la IA](ia.md).
3. **Apply.** Cuando termine, abrir `https://NOMBRE.onrender.com/salud` (la dirección sale en el panel del servicio): tiene que responder con `"estado":"ok"`. En **Logs** tiene que aparecer `Curso: PostgreSQL (DATABASE_URL).`, y `https://NOMBRE.onrender.com/api/cursos` tiene que devolver el curso.

Cada cambio que entre en `main` se despliega solo.

## 4. Frontend en Netlify

1. **Import from Git** → GitHub y elegir el repositorio (o la copia). Si la rama tiene `netlify.toml`, Netlify rellena los ajustes de compilación. Si no, se ponen a mano: *Base directory* `frontend`, *Build command* `npm run build`, *Publish directory* `dist` (Netlify ya antepone `frontend/`) y, en *More options*, versión de Node `22`.
2. Antes de desplegar, en **Keys and secrets** (o *Environment variables*), añadir `VITE_API_URL` con la dirección del backend, sin barra final: `https://NOMBRE.onrender.com`. **Sin marcar *Secret***: no es un dato secreto, porque va dentro del código de la app, y si se marca, Netlify detiene el despliegue al encontrarla en él.
3. **Start building.** La dirección de la app sale en el panel, del tipo `https://NOMBRE.netlify.app`. Las apps nuevas son privadas, solo visibles para el equipo de Netlify, hasta que se pulsa **Publish** (o *Make public*): hace falta para compartirla o enseñarla en una demo.
4. **Volver a Render** y cambiar `FRONTEND_URL` por la dirección de Netlify, sin barra final. Sin este paso, el navegador bloquea las peticiones al backend (CORS) y la app usa sus datos de ejemplo.

`VITE_API_URL` se lee al compilar: si cambia, hay que volver a desplegar en Netlify (*Deploys → Trigger deploy*).

## 5. Comprobar

La app lleva una copia del curso y la usa si el backend no responde, así que a simple vista funciona igual esté conectada o no. Para comprobarlo:

1. Abrir la app de Netlify en una pestaña propia (no dentro del panel de Netlify), pulsar F12 → pestaña **Red** → **Todos**, escribir `onrender` en el filtro y recargar. Tienen que salir `salud` y `cursos` con estado 200, y la pestaña **Consola** no debe mostrar errores de CORS.
2. Para confirmar que los datos salen de la base de datos, cambiar en Supabase (*Table Editor → lecciones*) el título de una lección y recargar la app: tiene que verse el cambio. Después se deja como estaba, a mano o volviendo a ejecutar `cargar_curso.sh`.

Si no sale ninguna petición, revisar `VITE_API_URL` en Netlify y volver a desplegar. Si salen pero con error de CORS, revisar `FRONTEND_URL` en Render.

De momento, el backend solo lee el curso: las cuentas y el progreso de los alumnos se guardan en el navegador, no en la base de datos.

## 6. Mantener la copia al día

Si se despliega desde una copia, Render y Netlify solo se actualizan cuando cambia la copia.

**A mano.** En la página de la copia en GitHub, **Sync fork → Update branch**.

**Automáticamente.** Un flujo de GitHub Actions en la copia la sincroniza cada 30 minutos. El flujo no puede estar en `main`, porque `main` tiene que ser idéntica a la del repositorio original; va en una rama aparte que se marca como principal, ya que las tareas programadas solo se ejecutan en la rama principal.

1. En la copia, crear la rama `sincronizar` a partir de `main` y añadir el fichero `.github/workflows/sincronizar.yml`:

   ```yaml
   name: Sincronizar con el repositorio original
   on:
     schedule:
       - cron: '*/30 * * * *'
     workflow_dispatch:
   jobs:
     sincronizar:
       runs-on: ubuntu-latest
       steps:
         - run: gh repo sync "$GITHUB_REPOSITORY" --branch main
           env:
             GH_TOKEN: ${{ secrets.TOKEN_SINCRONIZAR }}
   ```

2. Crear un token en GitHub (*Settings → Developer settings → Fine-grained tokens*), limitado a la copia, con permisos **Contents** y **Workflows** de lectura y escritura. El de *Workflows* hace falta porque el repositorio original tiene flujos en `.github/workflows/`, y el token que GitHub da por defecto a las Actions no puede actualizarlos.
3. Guardarlo en la copia como secreto `TOKEN_SINCRONIZAR` (*Settings → Secrets and variables → Actions*).
4. En *Settings → General*, poner `sincronizar` como rama principal (*Default branch*).
5. En la pestaña **Actions** de la copia, activar los flujos: GitHub los desactiva en las copias. Para probarlo, *Sincronizar con el repositorio original → Run workflow*.

Render y Netlify siguen desplegando desde `main`. Si alguien sube cambios directamente a `main` de la copia, la sincronización falla hasta que se deshagan: los cambios propios van en otras ramas.

## 7. Antes de una demo

- **Render se duerme.** En el plan gratuito, el backend se apaga tras 15 minutos sin peticiones y tarda alrededor de un minuto en volver. La app espera 8 segundos y, si no hay respuesta, sigue con sus datos de ejemplo. Unos minutos antes, abrir `https://NOMBRE.onrender.com/salud` y esperar a que responda.
- **Supabase se pausa** si el proyecto tiene muy poca actividad durante una semana. Se reactiva desde el panel con **Resume project**, con los datos intactos.

## 8. Problemas frecuentes

| Síntoma | Causa probable |
|---|---|
| `/api/cursos` responde 503 `base_datos_no_disponible` | `DATABASE_URL` mal copiada (por ejemplo, la conexión directa en lugar del *Session pooler*), proyecto de Supabase pausado o tablas sin crear. El motivo aparece en *Logs* de Render. |
| `/api/cursos` responde 503 `base_datos_sin_cursos` | Las tablas existen, pero el curso no está cargado: repetir `./migraciones/cargar_curso.sh` del paso 2.4. |
| La app no muestra errores pero no usa el backend | CORS: `FRONTEND_URL` en Render no coincide exactamente con la dirección de Netlify (con `https://` y sin barra final). |
| `aplicar.sh` falla al conectar | Variables `PG...` de otra terminal, o la contraseña con un error. Se comprueba con `psql -c 'select 1'`. |
