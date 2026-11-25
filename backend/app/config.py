"""Configuración del backend, leída solo del entorno.

AGENTS.md prohíbe los secretos en el repositorio: aquí no se escribe ningún valor,
solo los nombres de las variables. Los nombres en inglés del entorno
(`DATABASE_URL`, `GROQ_API_KEY`) son la convención del ecosistema; los atributos
internos van en español, como el resto del proyecto.
"""

from __future__ import annotations

from functools import lru_cache

from pydantic import AliasChoices, Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Configuracion(BaseSettings):
    """Variables de entorno que necesita el backend para arrancar."""

    model_config = SettingsConfigDict(
        env_file=".env",
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
