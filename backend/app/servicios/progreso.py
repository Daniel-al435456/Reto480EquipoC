"""Progreso del alumno en la base de datos (issue #60).

Matrícula, resultado del test inicial, dominio, sesiones de estudio, lecciones completadas y
eventos de aprendizaje. Todo se guarda con el `alumno_id`, sin datos personales (SPEC §6).

- **Curso actual:** la matrícula que se tocó por última vez (`actualizado_en`). Elegir un curso,
  guardar su test o empezar una sesión en él lo matricula si hacía falta y lo hace el actual.
- **Dominio:** `dominios` va por concepto y el frontend, por lección. Una lección está dominada si
  el alumno domina todos sus conceptos (`lecciones_conceptos`). `nivel_test` es lo que dijo el
  test y `nivel`, lo que usa el itinerario: estudiar igualmente una lección cambia `nivel` y
  conserva `nivel_test`. De momento los niveles son 1 (domina) o 0.
  Hoy cada lección tiene un concepto propio (`cargar_curso.sql`). Si un concepto se compartiera
  entre lecciones, dominar una daría por dominado el concepto en las demás, y estudiar igualmente
  una lo quitaría también de las otras.
- **Test hecho:** al guardar el test se escribe una fila por cada concepto del curso, también los
  que no domina. Así se sabe que lo ha hecho aunque no domine nada.
- **Lecciones completadas:** las marcadas como completadas en las sesiones del alumno. Una
  lección siempre se completa dentro de una sesión, también cuando el alumno la elige suelta.
  Se admite completarla aunque la sesión ya haya terminado (por ejemplo, abandonada al empezar
  otra en otro dispositivo): completar es un hecho, no un cambio de estado de la sesión.
- **Sesión a medio hacer:** no se guarda en qué paso iba. Desde otro dispositivo se recuperan
  las lecciones completadas, no la sesión.
"""

from __future__ import annotations

import json

from app.errores import ErrorDeNegocio
from app.esquemas import (
    EntradaEvento,
    EntradaResultadoTest,
    EntradaSesionEstudio,
    Progreso,
)
from app.persistencia import Conexion, conexion

#: Estados de una sesión que todavía no ha terminado.
ABIERTAS = ("planificada", "en_curso")

_LECCIONES_DEL_CURSO = """
    SELECT le.id
    FROM lecciones le
    JOIN videos v ON v.id = le.video_id
    WHERE v.curso_id = %s AND le.id = ANY(%s)
"""

# Por cada lección del curso, si el alumno domina todos sus conceptos según el test y ahora.
_DOMINIO = """
    SELECT le.id,
           bool_and(coalesce(d.nivel_test, 0) >= 1) AS segun_test,
           bool_and(coalesce(d.nivel, 0) >= 1) AS ahora
    FROM lecciones le
    JOIN videos v ON v.id = le.video_id
    JOIN lecciones_conceptos lc ON lc.leccion_id = le.id
    LEFT JOIN dominios d ON d.concepto_id = lc.concepto_id AND d.alumno_id = %(alumno)s
    WHERE v.curso_id = %(curso)s
    GROUP BY le.id, v.orden, le.inicio_s
    ORDER BY v.orden, le.inicio_s
"""

_TEST_HECHO = """
    SELECT EXISTS (
        SELECT 1 FROM dominios d
        JOIN conceptos c ON c.id = d.concepto_id
        WHERE d.alumno_id = %(alumno)s AND c.curso_id = %(curso)s AND d.nivel_test IS NOT NULL
    ) AS hecho
"""

# En el orden en que se completaron por primera vez. El `actualizado_en` de una fila de
# sesiones_lecciones hace de "completada en": solo se actualiza al completarla (completar_leccion).
# Si algo más llegara a actualizar esas filas, este orden cambiaría.
_COMPLETADAS = """
    SELECT sl.leccion_id
    FROM sesiones_lecciones sl
    JOIN sesiones s ON s.id = sl.sesion_id
    JOIN lecciones le ON le.id = sl.leccion_id
    JOIN videos v ON v.id = le.video_id
    WHERE s.alumno_id = %(alumno)s AND v.curso_id = %(curso)s AND sl.completado
    GROUP BY sl.leccion_id
    ORDER BY min(sl.actualizado_en), sl.leccion_id
"""


def _sin_curso() -> Progreso:
    return Progreso(curso_id=None, test_hecho=False, dominio_test={}, dominio={}, completadas=[])


def _exigir_curso(bd: Conexion, curso_id: str) -> None:
    if bd.execute("SELECT 1 FROM cursos WHERE id = %s", (curso_id,)).fetchone() is None:
        raise ErrorDeNegocio("curso_no_encontrado", f"No existe el curso «{curso_id}».", 404)


def _exigir_lecciones_del_curso(bd: Conexion, curso_id: str, lecciones: list[str]) -> None:
    """Todas las lecciones existen y son de ese curso (regla del backend, backend/README.md)."""
    encontradas = bd.execute(_LECCIONES_DEL_CURSO, (curso_id, lecciones)).fetchall()
    if len(encontradas) != len(set(lecciones)):
        raise ErrorDeNegocio(
            "lecciones_no_validas", "Alguna de las lecciones no es de este curso.", 422
        )


def _matricular(bd: Conexion, alumno_id: int, curso_id: str) -> None:
    """Matricula al alumno en el curso si no lo estaba y lo hace su curso actual.

    Si ya estaba matriculado, la fila se actualiza sin cambiar nada: el trigger pone
    `actualizado_en` a la hora actual, que es lo que decide el curso actual.
    """
    bd.execute(
        "INSERT INTO matriculas (alumno_id, curso_id) VALUES (%s, %s) "
        "ON CONFLICT (alumno_id, curso_id) DO UPDATE SET estado = matriculas.estado",
        (alumno_id, curso_id),
    )


def _progreso(bd: Conexion, alumno_id: int, curso_id: str) -> Progreso:
    parametros = {"alumno": alumno_id, "curso": curso_id}
    lecciones = bd.execute(_DOMINIO, parametros).fetchall()
    hecho = bd.execute(_TEST_HECHO, parametros).fetchone()
    completadas = bd.execute(_COMPLETADAS, parametros).fetchall()
    return Progreso(
        curso_id=curso_id,
        test_hecho=bool(hecho and hecho["hecho"]),
        dominio_test={fila["id"]: True for fila in lecciones if fila["segun_test"]},
        dominio={fila["id"]: True for fila in lecciones if fila["ahora"]},
        completadas=[fila["leccion_id"] for fila in completadas],
    )


def obtener_progreso(alumno_id: int) -> Progreso:
    """El progreso en el curso actual, o vacío si el alumno no se ha matriculado en ninguno."""
    with conexion() as bd:
        fila = bd.execute(
            "SELECT curso_id FROM matriculas WHERE alumno_id = %s "
            "ORDER BY actualizado_en DESC, creado_en DESC LIMIT 1",
            (alumno_id,),
        ).fetchone()
        return _progreso(bd, alumno_id, fila["curso_id"]) if fila else _sin_curso()


def matricular(alumno_id: int, curso_id: str) -> Progreso:
    """El alumno elige un curso: pasa a ser el actual y se devuelve su progreso."""
    with conexion() as bd:
        _exigir_curso(bd, curso_id)
        _matricular(bd, alumno_id, curso_id)
        return _progreso(bd, alumno_id, curso_id)


def guardar_test(alumno_id: int, curso_id: str, entrada: EntradaResultadoTest) -> Progreso:
    """Guarda el resultado del test inicial. Si ya lo había hecho, lo sustituye.

    Pone `nivel` y `nivel_test` de cada concepto del curso a 1 si es de una lección dominada y a
    0 si no. Por eso repetir el test también deshace lo que el alumno eligió estudiar igualmente.
    """
    dominadas = [leccion for leccion, domina in entrada.dominio.items() if domina]
    with conexion() as bd:
        _exigir_curso(bd, curso_id)
        _exigir_lecciones_del_curso(bd, curso_id, list(entrada.dominio))
        _matricular(bd, alumno_id, curso_id)
        bd.execute(
            """
            INSERT INTO dominios (alumno_id, concepto_id, nivel, nivel_test)
            SELECT %(alumno)s, c.id, n.valor, n.valor
            FROM conceptos c,
                 LATERAL (
                     SELECT EXISTS (
                         SELECT 1 FROM lecciones_conceptos lc
                         WHERE lc.concepto_id = c.id AND lc.leccion_id = ANY(%(dominadas)s)
                     )::int AS valor
                 ) n
            WHERE c.curso_id = %(curso)s
            ON CONFLICT (alumno_id, concepto_id)
            DO UPDATE SET nivel = EXCLUDED.nivel, nivel_test = EXCLUDED.nivel_test
            """,
            {"alumno": alumno_id, "curso": curso_id, "dominadas": dominadas},
        )
        return _progreso(bd, alumno_id, curso_id)


def estudiar_igualmente(alumno_id: int, curso_id: str, leccion_id: str, estudiar: bool) -> Progreso:
    """Estudiar una lección que el test dio por dominada, o volver a saltarla.

    La IA recomienda, pero no decide (AGENTS.md). Volver a saltarla solo la da por dominada si el
    test lo dijo. Sin test hecho no hay nada que cambiar.
    """
    with conexion() as bd:
        _exigir_curso(bd, curso_id)
        if not bd.execute(_LECCIONES_DEL_CURSO, (curso_id, [leccion_id])).fetchone():
            raise ErrorDeNegocio("leccion_no_encontrada", "Esa lección no es de este curso.", 404)
        bd.execute(
            "UPDATE dominios d SET nivel = CASE WHEN %(estudiar)s THEN 0 "
            "ELSE coalesce(d.nivel_test, 0) END "
            "FROM lecciones_conceptos lc "
            "WHERE lc.leccion_id = %(leccion)s AND d.concepto_id = lc.concepto_id "
            "AND d.alumno_id = %(alumno)s",
            {"estudiar": estudiar, "leccion": leccion_id, "alumno": alumno_id},
        )
        return _progreso(bd, alumno_id, curso_id)


def crear_sesion(alumno_id: int, entrada: EntradaSesionEstudio) -> int:
    """Crea una sesión de estudio en curso con sus lecciones, en orden. Devuelve su id.

    Todas las lecciones son del mismo curso; una repetida se guarda una vez, en su primer
    puesto. La sesión que siguiera abierta queda abandonada: el alumno solo estudia una a la vez.
    """
    lecciones = list(dict.fromkeys(entrada.lecciones))
    with conexion() as bd:
        # Una sesión a la vez por alumno: si llegan dos a la vez (dos dispositivos, un doble
        # toque), la segunda espera aquí a la primera y la deja abandonada.
        bd.execute("SELECT 1 FROM alumnos WHERE id = %s FOR UPDATE", (alumno_id,))
        _exigir_curso(bd, entrada.curso_id)
        _exigir_lecciones_del_curso(bd, entrada.curso_id, lecciones)
        _matricular(bd, alumno_id, entrada.curso_id)
        bd.execute(
            "UPDATE sesiones SET estado = 'abandonada' WHERE alumno_id = %s AND estado = ANY(%s)",
            (alumno_id, list(ABIERTAS)),
        )
        fila = bd.execute(
            "INSERT INTO sesiones (alumno_id, minutos, audio, estado) "
            "VALUES (%s, %s, %s, 'en_curso') RETURNING id",
            (alumno_id, entrada.minutos, entrada.audio),
        ).fetchone()
        if fila is None:
            raise ErrorDeNegocio("interno", "No se ha podido guardar la sesión.", 500)
        sesion_id = int(fila["id"])
        bd.execute(
            "INSERT INTO sesiones_lecciones (sesion_id, leccion_id, orden) "
            "SELECT %s, leccion, orden "
            "FROM unnest(%s::text[]) WITH ORDINALITY AS l(leccion, orden)",
            (sesion_id, lecciones),
        )
        return sesion_id


def _estado_de_la_sesion(bd: Conexion, alumno_id: int, sesion_id: int) -> str:
    """El estado de una sesión del alumno, bloqueada hasta terminar la transacción.

    Si no existe o es de otro alumno, el error es el mismo: no se revela que existe.
    """
    fila = bd.execute(
        "SELECT estado FROM sesiones WHERE id = %s AND alumno_id = %s FOR UPDATE",
        (sesion_id, alumno_id),
    ).fetchone()
    if fila is None:
        raise ErrorDeNegocio("sesion_no_encontrada", "No se encuentra esa sesión de estudio.", 404)
    return str(fila["estado"])


def completar_leccion(alumno_id: int, sesion_id: int, leccion_id: str) -> None:
    """Marca una lección de la sesión como completada, aunque la sesión ya haya terminado.

    Repetirlo no cambia nada, ni siquiera la fecha: el orden de las completadas es el de la
    primera vez.
    """
    with conexion() as bd:
        # Comprueba que la sesión es del alumno.
        _estado_de_la_sesion(bd, alumno_id, sesion_id)
        fila = bd.execute(
            "SELECT completado FROM sesiones_lecciones WHERE sesion_id = %s AND leccion_id = %s",
            (sesion_id, leccion_id),
        ).fetchone()
        if fila is None:
            raise ErrorDeNegocio(
                "leccion_no_encontrada", "Esa lección no es de esta sesión de estudio.", 404
            )
        if fila["completado"]:
            return
        # Esta fecha hace de "completada en" (ver _COMPLETADAS).
        bd.execute(
            "UPDATE sesiones_lecciones SET completado = true "
            "WHERE sesion_id = %s AND leccion_id = %s",
            (sesion_id, leccion_id),
        )


def terminar_sesion(alumno_id: int, sesion_id: int, estado: str) -> None:
    """Termina la sesión como completada o abandonada. Repetir la misma petición no da error."""
    with conexion() as bd:
        actual = _estado_de_la_sesion(bd, alumno_id, sesion_id)
        if actual == estado:
            return
        if actual not in ABIERTAS:
            raise ErrorDeNegocio("sesion_terminada", "Esa sesión de estudio ya ha terminado.", 409)
        bd.execute("UPDATE sesiones SET estado = %s WHERE id = %s", (estado, sesion_id))


def guardar_evento(alumno_id: int, entrada: EntradaEvento) -> None:
    """Guarda un evento de aprendizaje. El esquema ya ha validado el tipo y los detalles.

    El curso de los detalles tiene que existir: así ese texto no puede llevar otra cosa, como
    un nombre.
    """
    detalles = entrada.detalles.model_dump(by_alias=True, exclude_none=True)
    with conexion() as bd:
        curso_id = entrada.detalles.curso_id
        if (
            curso_id
            and not bd.execute("SELECT 1 FROM cursos WHERE id = %s", (curso_id,)).fetchone()
        ):
            raise ErrorDeNegocio(
                "datos_no_validos", "Algún dato no es válido. Revísalo y vuelve a intentarlo.", 422
            )
        bd.execute(
            "INSERT INTO eventos (alumno_id, tipo, leccion_id, pregunta_id, valor, detalles) "
            "VALUES (%s, %s, %s, %s, %s, %s::jsonb)",
            (
                alumno_id,
                entrada.tipo,
                entrada.leccion_id,
                entrada.pregunta_id,
                entrada.valor,
                json.dumps(detalles),
            ),
        )
