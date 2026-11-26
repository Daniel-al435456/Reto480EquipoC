import { useState } from 'react';
import { Boton } from '../componentes/Boton.jsx';
import { Pantalla } from '../componentes/Pantalla.jsx';
import { useEstado } from '../hooks/useEstado.jsx';
import comun from './comun.module.css';
import { PASOS_ALTA } from './Registro.jsx';

const EMAIL_VALIDO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Consentimiento de la familia para alumnos menores de 14 años (propuesta P3).
 * En España, el tratamiento de sus datos requiere el consentimiento de sus progenitores o tutores legales.
 * Prototipo: no se envía ningún correo ni se guarda la dirección; solo se registra la fecha del consentimiento.
 * Con backend, la familia recibirá un correo para confirmarlo.
 */
export function Consentimiento({ navegar }) {
  const { estado, registrarConsentimiento, registrarEvento } = useEstado();
  const [email, setEmail] = useState('');
  const [acepta, setAcepta] = useState(false);
  const emailValido = EMAIL_VALIDO.test(email.trim());

  const continuar = () => {
    registrarConsentimiento();
    registrarEvento('consentimiento_familia');
    navegar('/alias');
  };

  return (
    <Pantalla
      titulo="Necesitamos el permiso de tu familia"
      subtitulo="Como tienes menos de 14 años, tu madre, padre o tutor legal tiene que dar su consentimiento para que uses la aplicación."
      alVolver={() => navegar('/edad')}
      progreso={{ valor: 2, maximo: PASOS_ALTA, etiqueta: `Paso 2 de ${PASOS_ALTA}` }}
      pie={
        <Boton anchoCompleto disabled={!emailValido || !acepta} onClick={continuar}>
          Continuar
        </Boton>
      }
    >
      <div className={comun.tarjeta}>
        <h2>Qué datos usamos</h2>
        <ul className={comun.medio} style={{ margin: 0, paddingLeft: '1.25rem' }}>
          <li>Tu alias, tus respuestas y tu progreso, para adaptar el curso a lo que ya sabes.</li>
          <li>Tus preguntas al mentor, sin tu nombre ni otros datos personales.</li>
          <li>Tu familia puede pedir ver o borrar estos datos cuando quiera.</li>
        </ul>
      </div>

      <div className={comun.grupo}>
        <label htmlFor="email-familia" style={{ fontWeight: 700, fontSize: '0.9375rem' }}>
          Correo de tu madre, padre o tutor legal
        </label>
        <input
          id="email-familia"
          className={comun.campo}
          type="email"
          inputMode="email"
          autoComplete="off"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          aria-describedby="nota-email"
        />
        <p id="nota-email" className={comun.secundario}>
          Tu familia recibirá un correo para confirmarlo cuando la academia active los envíos. Por ahora no se envía ni
          se guarda.
        </p>
      </div>

      <label className={comun.opcion}>
        <input type="checkbox" checked={acepta} onChange={(e) => setAcepta(e.target.checked)} />
        <span>Mi madre, padre o tutor legal ha leído esta información y da su consentimiento.</span>
      </label>
    </Pantalla>
  );
}
