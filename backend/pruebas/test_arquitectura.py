"""Pruebas de arquitectura.

Convierten en sensor lo que AGENTS.md y SPEC §5 solo pedían por escrito:
si una regla se puede comprobar, no se pide: se comprueba.
"""

from __future__ import annotations

import re
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[1]
CARPETA_APP = RAIZ / "app"
CARPETA_MIGRACIONES = RAIZ / "migraciones"
CARPETA_PRUEBAS = RAIZ / "pruebas"

PATRON_SECRETO = re.compile(
    r"""(?ix)
    (?: api[_-]?key | token | secret | contrasena | password )
    \s* [:=] \s*
    ["'] [^"'] {8,} ["']
    """
)
PREFIJOS_DE_CLAVE = ("gsk_", "sk-ant-", "ghp_", "glpat-")

#: Importaciones y direcciones que solo pueden aparecer en `app/privacidad.py`.
#: Se buscan imports de verdad: leer una clave del entorno (`GROQ_API_KEY` en
#: `config.py`) no es hablar con la IA, eso sí está permitido fuera del filtro.
LLAMADAS_A_LA_IA = re.compile(
    r"""(?ix)
    \b (?: import | from ) \s+ (?: groq | anthropic | openai | httpx | requests | urllib ) \b
    | \b api \. groq \. com
    | \b api \. anthropic \. com
    | \b openai \. com
    """
)

PATRON_DDL = re.compile(r"\b(?:CREATE|ALTER|DROP)\s+TABLE\b", re.IGNORECASE)


def _ficheros_python() -> list[Path]:
    return [ruta for ruta in CARPETA_APP.rglob("*.py") if ".venv" not in ruta.parts]


def _fuente(ruta: Path) -> str:
    return ruta.read_text(encoding="utf-8")


def test_no_hay_secretos_escritos_en_el_codigo() -> None:
    """Ninguna clave o contraseña puede vivir en el código fuente: van en el entorno."""
    hallados = []
    for ruta in _ficheros_python():
        for numero, linea in enumerate(_fuente(ruta).splitlines(), 1):
            if PATRON_SECRETO.search(linea) or any(p in linea for p in PREFIJOS_DE_CLAVE):
                hallados.append(f"{ruta.relative_to(RAIZ)}:{numero}")
    assert not hallados, f"Secretos escritos en el código: {', '.join(hallados)}"


def test_las_urls_de_los_servicios_viven_en_el_entorno() -> None:
    """Issue #12: la conexión con PostgreSQL va por variables de entorno, no en el código."""
    prohibidos = ("postgresql://", "postgres://", "psql://", "@localhost:5432", "@127.0.0.1")
    culpables = []
    for ruta in _ficheros_python():
        for numero, linea in enumerate(_fuente(ruta).splitlines(), 1):
            if any(prohibido in linea.lower() for prohibido in prohibidos):
                culpables.append(f"{ruta.relative_to(RAIZ)}:{numero}")
    assert not culpables, f"Conexiones escritas en el código: {', '.join(culpables)}"


def test_solo_privacidad_puede_hablar_con_la_ia() -> None:
    """SPEC §5: el filtro de privacidad es el único módulo que habla con la IA.

    Cazan los SDK de los proveedores (groq, anthropic, openai), los clientes
    HTTP habituales (httpx, requests, urllib) y las URL de las API. Antes solo
    se miraban tres cadenas y `import groq` en `servicios/` pasaba en verde.
    """
    privilegiado = CARPETA_APP / "privacidad.py"
    culpables = []
    for ruta in _ficheros_python():
        if ruta == privilegiado:
            continue
        coincidencia = LLAMADAS_A_LA_IA.search(_fuente(ruta))
        if coincidencia:
            culpables.append(f"{ruta.relative_to(RAIZ)} → {coincidencia.group(0).strip()}")
    assert not culpables, f"Llamadas a la IA fuera de privacidad.py: {', '.join(culpables)}"


def test_los_routers_no_acceden_a_la_base_de_datos() -> None:
    """AGENTS.md: los routers validan y delegan; la lógica (y los datos) van en servicios/."""
    prohibidos = ("sqlalchemy", "psycopg", "from app.persistencia", "import persistencia")
    culpables = []
    for ruta in (CARPETA_APP / "routers").rglob("*.py"):
        fuente = _fuente(ruta)
        for prohibido in prohibidos:
            if prohibido in fuente:
                culpables.append(f"{ruta.name} → {prohibido}")
    assert not culpables, f"Los routers tocan la base de datos: {', '.join(culpables)}"


def test_el_esquema_de_la_base_de_datos_solo_vive_en_migraciones() -> None:
    """AGENTS.md: los cambios de esquema solo con scripts en backend/migraciones/."""
    culpables = []
    for ruta in _ficheros_python():
        if PATRON_DDL.search(_fuente(ruta)):
            culpables.append(str(ruta.relative_to(RAIZ)))
    for ruta in RAIZ.rglob("*.sql"):
        if ".venv" in ruta.parts:
            continue
        if not str(ruta).startswith(str(CARPETA_MIGRACIONES)):
            culpables.append(str(ruta.relative_to(RAIZ)))
    assert not culpables, f"Tablas definidas fuera de migraciones/: {', '.join(culpables)}"


def test_cada_endpoint_tiene_su_prueba() -> None:
    """AGENTS.md: pruebas con pytest, al menos una por endpoint.

    Las rutas se leen de `openapi()`, API pública de FastAPI. Mirar
    `app.routes` no sirve: desde FastAPI 0.165 las rutas montadas con
    `include_router` se envuelven en un objeto sin `path`, así que esta
    prueba pasaba sin revisar ningún endpoint. Una ruta con parámetro
    (`/alumnos/{alumno_id}`) se busca como `/alumnos/<algo>` en el texto.
    """
    from app.main import crear_app

    ignoradas = ("/docs", "/redoc", "/openapi.json")
    ficheros = (
        ruta
        for ruta in sorted(CARPETA_PRUEBAS.rglob("*.py"))
        # Este fichero no llama a ningún endpoint: si lo leyera, cualquier ruta
        # mencionada en su docstring parecería probada.
        if ".venv" not in ruta.parts and ruta.name != "test_arquitectura.py"
    )
    texto_pruebas = "\n".join(_fuente(ruta) for ruta in ficheros)
    sin_prueba = []
    for destino in crear_app().openapi()["paths"]:
        if destino.startswith(ignoradas):
            continue
        patron = "/".join(
            re.escape(parte) if not parte.startswith("{") else "[^/]+"
            for parte in destino.split("/")
        )
        # La ruta tiene que aparecer tras una comilla: así solo cuenta una
        # llamada real (`cliente.get("/salud")`), no una mención en un texto.
        if not re.search(rf"(?<=['\"]){patron}", texto_pruebas):
            sin_prueba.append(destino)
    assert not sin_prueba, f"Endpoints sin prueba: {', '.join(sin_prueba)}"
