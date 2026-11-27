"""Configuración del backend, leída solo del entorno.

AGENTS.md prohíbe los secretos en el repositorio: aquí no se escribe ningún valor,
solo los nombres de las variables. Los nombres en inglés del entorno
(`DATABASE_URL`, `GROQ_API_KEY`) son la convención del ecosistema; los atributos
internos van en español, como el resto del proyecto.
"""

from __future__ import annotations

from functools import lru_cache
from pathlib import Path

from pydantic import AliasChoices, Field
from pydantic_settings import BaseSettings, SettingsConfigDict

#: `.env` vive en `backend/`, junto a este paquete: la ruta no depende de la
#: carpeta desde la que se arrance el servidor.
ARCHIVO_ENV = Path(__file__).resolve().parent.parent / ".env"


class Configuracion(BaseSettings):
    """Variables de entorno que necesita el backend para arrancar."""

    model_config = SettingsConfigDict(
        env_file=ARCHIVO_ENV,
        env_file_encoding="utf-8",
        extra="ignore",
        populate_by_name=True,
    )

    nombre_servicio: str = Field(
        default="reto480-api",
        validation_alias=AliasChoices("SERVICE_NAME", "nombre_servicio"),
    )
    entorno: str = Field(
        default="desarrollo",
        validation_alias=AliasChoices("ENTORNO", "entorno"),
    )
    url_base_datos: str = Field(
        default="",
        validation_alias=AliasChoices("DATABASE_URL", "url_base_datos"),
    )
    clave_groq: str = Field(
        default="",
        validation_alias=AliasChoices("GROQ_API_KEY", "clave_groq"),
    )
    # Modelos de cada agente (SPEC §7, propuesta P1). Están aquí, en un solo sitio, para poder
    # cambiar de modelo o de proveedor sin tocar el resto del código.
    modelo_diagnostico: str = Field(
        default="openai/gpt-oss-20b",
        validation_alias=AliasChoices("MODELO_DIAGNOSTICO", "modelo_diagnostico"),
    )
    modelo_correccion: str = Field(
        default="openai/gpt-oss-20b",
        validation_alias=AliasChoices("MODELO_CORRECCION", "modelo_correccion"),
    )
    modelo_mentor: str = Field(
        default="openai/gpt-oss-120b",
        validation_alias=AliasChoices("MODELO_MENTOR", "modelo_mentor"),
    )
    url_frontend: str = Field(
        default="http://localhost:5173",
        validation_alias=AliasChoices("FRONTEND_URL", "url_frontend"),
    )

    @property
    def origenes_cors(self) -> list[str]:
        """Orígenes permitidos, separados por comas en la variable de entorno."""
        return [origen.strip() for origen in self.url_frontend.split(",") if origen.strip()]


@lru_cache(maxsize=1)
def obtener_configuracion() -> Configuracion:
    """Configuración del proceso, cacheada para no releer el entorno en cada petición."""
    return Configuracion()
