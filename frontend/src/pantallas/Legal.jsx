import { Pantalla } from '../componentes/Pantalla.jsx';
import { useEstado } from '../hooks/useEstado.jsx';
import comun from './comun.module.css';
import estilos from './Legal.module.css';

/*
 * Páginas legales: política de privacidad, política de cookies y aviso legal.
 * Son borradores del equipo basados en el diseño de privacidad aprobado (propuesta P3).
 * Los datos entre corchetes y el texto definitivo debe completarlos y revisarlos 480 Academy.
 */

const PENDIENTE = (texto) => <span className={estilos.pendiente}>[{texto}]</span>;

const PAGINAS = {
  privacidad: {
    titulo: 'Política de privacidad',
    contenido: (
      <>
        <h2>Quién trata tus datos</h2>
        <p>
          El responsable del tratamiento es 480 Academy ({PENDIENTE('razón social, NIF y dirección')}). Puedes contactar
          con su delegado de protección de datos en {PENDIENTE('correo de contacto')}.
        </p>

        <h2>Qué datos tratamos y para qué</h2>
        <ul>
          <li>
            <strong>Datos de tu cuenta:</strong> nombre, apellidos, correo electrónico, empresa y, si lo indicas, puesto o
            área. Sirven para darte acceso y gestionar tu formación.
          </li>
          <li>
            <strong>Fecha de nacimiento:</strong> para saber si eres menor de 14 años, de 14 a 17 o mayor de edad, y
            actualizarlo solo cuando cumplas años. Sirve para proteger tus datos y adaptar el tono del mentor.
          </li>
          <li>
            <strong>Datos de aprendizaje:</strong> respuestas al test y a las actividades, lecciones completadas, tiempo
            de estudio y preferencias. Sirven para adaptar el curso a lo que ya sabes.
          </li>
          <li>
            <strong>Conversaciones con el mentor:</strong> tus preguntas y sus respuestas, para continuar la conversación.
          </li>
        </ul>

        <h2>El mentor con inteligencia artificial</h2>
        <p>
          El mentor usa un servicio de IA externo. Antes de enviarle nada, eliminamos tu identidad: solo recibe un alias,
          si eres menor de edad o no, la personalidad que has elegido para el mentor, cómo quieres que se dirija a ti,
          tu nivel en cada tema y el texto de tu pregunta, del que quitamos correos, teléfonos o nombres que escribas.
          Nunca recibe tu nombre, tus apellidos, tu correo ni tu fecha de nacimiento.
        </p>
        <p>
          El proveedor ({PENDIENTE('proveedor definitivo')}) no usa estos datos para entrenar sus modelos, según su
          contrato. La IA solo recomienda: no toma decisiones automáticas sobre ti y puedes elegir cualquier contenido.
          Puedes desactivar el mentor con IA cuando quieras en Perfil → Privacidad y datos.
        </p>

        <h2>Menores de edad</h2>
        <p>
          Si tienes menos de 14 años, necesitamos el consentimiento de tu madre, padre o tutor legal. Con alumnos menores
          de edad, el mentor usa un tono adaptado, evita temas personales y deriva a una persona ante cualquier señal de
          malestar.
        </p>

        <h2>Cuánto tiempo los guardamos</h2>
        <ul>
          <li>Conversaciones con el mentor: 90 días.</li>
          <li>Progreso y nivel por tema: mientras tengas acceso a 480 Academy.</li>
          <li>Registros técnicos del servicio de IA: solo datos de uso (coste, tiempo de respuesta), sin contenido.</li>
        </ul>

        <h2>Base legal</h2>
        <p>
          El tratamiento se basa en la ejecución del contrato de formación entre 480 Academy y tu empresa, que incluye el
          acompañamiento durante el curso, y, para menores de 14 años, en el consentimiento de su familia.
        </p>

        <h2>Tus derechos</h2>
        <p>
          Puedes acceder a tus datos, corregirlos, descargarlos o pedir que se borren. Desde Perfil → Privacidad y datos
          puedes descargar tus datos, borrar tu historial con el mentor y eliminar tu cuenta. También puedes escribir a{' '}
          {PENDIENTE('correo de contacto')} o reclamar ante la Agencia Española de Protección de Datos (aepd.es).
        </p>
      </>
    ),
  },
  cookies: {
    titulo: 'Política de cookies',
    contenido: (
      <>
        <h2>No usamos cookies propias</h2>
        <p>
          La aplicación no instala cookies propias ni de publicidad. Para funcionar, guarda en el almacenamiento de tu
          navegador tu progreso, tus preferencias (tema, tamaño del texto, mentor) y, en esta versión, los datos de tu
          cuenta. Es imprescindible para el servicio y no se usa para seguirte.
        </p>

        <h2>Servicios de terceros</h2>
        <ul>
          <li>
            <strong>Vídeos de YouTube:</strong> se cargan desde youtube-nocookie.com y solo cuando pulsas reproducir. A
            partir de ese momento, YouTube puede usar sus propias tecnologías según su política.
          </li>
          <li>
            <strong>Tipografías:</strong> se descargan de Google Fonts, que recibe la dirección IP de tu dispositivo.{' '}
            {PENDIENTE('Valorar alojar las tipografías en el propio servidor para evitarlo')}
          </li>
        </ul>

        <h2>Cómo borrar los datos guardados</h2>
        <p>
          Puedes eliminar tu cuenta desde Perfil → Seguridad, o borrar los datos del sitio desde la configuración de tu
          navegador.
        </p>
      </>
    ),
  },
  'aviso-legal': {
    titulo: 'Aviso legal',
    contenido: (
      <>
        <h2>Titular</h2>
        <p>
          Esta aplicación es un servicio de 480 Academy ({PENDIENTE('razón social, NIF, domicilio, datos registrales y contacto')}
          ).
        </p>

        <h2>Uso de la aplicación</h2>
        <p>
          El acceso está reservado a personas con una cuenta facilitada por su empresa. Te comprometes a usarla para tu
          formación, a no compartir tu contraseña y a no introducir contenidos ilícitos u ofensivos en el chat con el
          mentor.
        </p>

        <h2>Contenidos y propiedad intelectual</h2>
        <p>
          Los cursos, textos y diseños pertenecen a 480 Academy o a sus autores. Los vídeos de YouTube incluidos
          pertenecen a sus autores y se muestran con el reproductor oficial.
        </p>

        <h2>Respuestas del mentor con IA</h2>
        <p>
          Las respuestas del mentor se generan con inteligencia artificial a partir del contenido del curso y pueden
          contener errores. Ante cualquier duda importante, consulta con un tutor de la academia.
        </p>

        <h2>Ley aplicable</h2>
        <p>Se aplica la legislación española. {PENDIENTE('Juzgados competentes')}</p>
      </>
    ),
  },
};

export function Legal({ pagina, navegar }) {
  const { estado } = useEstado();
  const datos = PAGINAS[pagina];
  if (!datos) return null;

  return (
    <Pantalla
      titulo={datos.titulo}
      alVolver={() => (window.history.length > 1 ? window.history.back() : navegar(estado.sesionIniciada ? '/perfil' : '/bienvenida'))}
    >
      <p className={comun.aviso}>
        Borrador del equipo, basado en el diseño de privacidad del proyecto. El texto definitivo y los datos entre
        corchetes debe completarlos y revisarlos 480 Academy.
      </p>
      <article className={estilos.texto}>{datos.contenido}</article>
    </Pantalla>
  );
}
