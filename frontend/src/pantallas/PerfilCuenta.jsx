import { useState } from 'react';
import { IconoCandado } from '../componentes/Iconos.jsx';
import { AvatarPixel } from '../componentes/AvatarPixel.jsx';
import { Boton } from '../componentes/Boton.jsx';
import { Campo } from '../componentes/Campo.jsx';
import { FilaAjuste } from '../componentes/FilaAjuste.jsx';
import { Pantalla } from '../componentes/Pantalla.jsx';
import { useEstado } from '../hooks/useEstado.jsx';
import comun from './comun.module.css';
import estilos from './Perfil.module.css';

const TRAMOS = { adulto: '18 años o más', '14a17': 'Entre 14 y 17 años', menor14: 'Menos de 14 años' };

const fecha = (iso) => new Date(iso).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });

/**
 * Perfil → Mi cuenta: alias, datos personales editables (nombre, apellidos y puesto) y datos fijos.
 * Los datos fijos se indican en el alta y solo puede corregirlos la academia: el correo, porque es el usuario
 * con el que se inicia sesión; la empresa, porque la relaciona con la formación que paga; y el tramo de edad
 * y el consentimiento, porque de ellos dependen las protecciones para menores.
 */
export function PerfilCuenta({ navegar }) {
  const { estado, actualizarCuenta, registrarEvento } = useEstado();
  const cuenta = estado.cuenta ?? {};
  const [datos, setDatos] = useState({
    nombre: cuenta.nombre ?? '',
    apellidos: cuenta.apellidos ?? '',
    puesto: cuenta.puesto ?? '',
  });
  const [errores, setErrores] = useState({});
  const [aviso, setAviso] = useState('');
  const cambiar = (clave) => (valor) => {
    setDatos((d) => ({ ...d, [clave]: valor }));
    setErrores((e) => ({ ...e, [clave]: undefined }));
    setAviso('');
  };

  const guardar = (evento) => {
    evento.preventDefault();
    const e = {};
    if (!datos.nombre.trim()) e.nombre = 'Indica tu nombre.';
    if (!datos.apellidos.trim()) e.apellidos = 'Indica tus apellidos.';
    setErrores(e);
    if (Object.keys(e).length) return;
    actualizarCuenta({
      nombre: datos.nombre.trim(),
      apellidos: datos.apellidos.trim(),
      puesto: datos.puesto.trim(),
    });
    registrarEvento('cuenta_actualizada');
    setAviso('Cambios guardados.');
  };

  return (
    <Pantalla titulo="Mi cuenta" alVolver={() => navegar('/perfil')} textoVolver="Volver al perfil">
      <section className={estilos.seccion} aria-labelledby="titulo-alias">
        <h2 id="titulo-alias">Alias</h2>
        <div className={estilos.ajustes}>
          <div className={estilos.filaAlias}>
            <AvatarPixel alias={estado.alias} tamano="mediano" />
            <div>
              <strong>{estado.alias}</strong>
              <p className={comun.secundario}>
                {estado.anonimo ? 'Modo anónimo: los tutores te ven con este alias.' : 'Los tutores ven tu nombre real.'}
              </p>
            </div>
          </div>
          <FilaAjuste texto="Cambiar alias y modo anónimo" alPulsar={() => navegar('/alias')} />
        </div>
      </section>

      <section className={estilos.seccion} aria-labelledby="titulo-datos">
        <h2 id="titulo-datos">Datos personales</h2>
        <p className={comun.secundario}>Solo los ven tu empresa y la academia. Nunca se envían a la IA.</p>
        <form className={comun.grupo} onSubmit={guardar} noValidate>
          <Campo etiqueta="Nombre" valor={datos.nombre} alCambiar={cambiar('nombre')} error={errores.nombre} autoComplete="given-name" />
          <Campo etiqueta="Apellidos" valor={datos.apellidos} alCambiar={cambiar('apellidos')} error={errores.apellidos} autoComplete="family-name" />
          <Campo etiqueta="Puesto o área" opcional valor={datos.puesto} alCambiar={cambiar('puesto')} autoComplete="organization-title" />
          <Boton type="submit">Guardar cambios</Boton>
          <p role="status" className={comun.secundario}>
            {aviso}
          </p>
        </form>
      </section>

      <section className={estilos.seccion} aria-labelledby="titulo-fijos">
        <h2 id="titulo-fijos">Datos de la cuenta</h2>
        <p className={comun.secundario}>
          Se indicaron al crear la cuenta y no se pueden cambiar desde la app. Si alguno no es correcto, pide a la academia
          que lo corrija.
        </p>
        <dl className={estilos.ajustes}>
          <DatoFijo texto="Correo electrónico" valor={cuenta.email} ayuda="Es tu usuario para iniciar sesión." />
          <DatoFijo texto="Empresa" valor={cuenta.empresa} />
          <DatoFijo texto="Tramo de edad" valor={TRAMOS[estado.tramoEdad] ?? 'Sin indicar'} />
          {estado.tramoEdad === 'menor14' && (
            <DatoFijo
              texto="Consentimiento de la familia"
              valor={estado.consentimientoFamilia ? fecha(estado.consentimientoFamilia) : 'Pendiente'}
            />
          )}
          {cuenta.creada && <DatoFijo texto="Cuenta creada" valor={fecha(cuenta.creada)} />}
        </dl>
      </section>
    </Pantalla>
  );
}

/** Dato de solo lectura, con un candado para indicar que no se puede editar. */
function DatoFijo({ texto, valor, ayuda }) {
  return (
    <div className={estilos.datoFijo}>
      <dt>
        {texto}
        {ayuda && <span className={comun.secundario}>{ayuda}</span>}
      </dt>
      <dd>
        <span>{valor}</span>
        <IconoCandado tamano={16} />
      </dd>
    </div>
  );
}
