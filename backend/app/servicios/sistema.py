"""Estado del servicio."""

from __future__ import annotations

from app.config import obtener_configuracion
from app.esquemas import SalidaSalud

#: Versión del código desplegado. Se actualiza en cada release.
VERSION_API = "0.1.0"


def estado_del_servicio() -> SalidaSalud:
    """Informa de que el servicio está en marcha.

    No toca la base de datos ni la IA: es el termómetro más barato que existe,
    para que un fallo de conexión no confunda el monitor.
    """
    return SalidaSalud(
        estado="ok",
        servicio=obtener_configuracion().nombre_servicio,
        version=VERSION_API,
    )
