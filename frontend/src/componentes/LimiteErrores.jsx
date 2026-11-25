import { Component } from 'react';

/**
 * Si una pantalla falla, muestra un mensaje con opciones en lugar de dejar la aplicación en blanco.
 * React solo permite capturar errores con un componente de clase.
 */
export class LimiteErrores extends Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('Error en la aplicación:', error, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <main className="fallo" role="alert">
        <h1>Algo ha fallado</h1>
        <p>No es culpa tuya. Tu progreso está guardado en este dispositivo.</p>
        <div className="fallo-acciones">
          <button type="button" onClick={() => window.location.reload()}>
            Volver a intentarlo
          </button>
          <button
            type="button"
            className="fallo-secundario"
            onClick={() => {
              window.location.hash = '/';
              window.location.reload();
            }}
          >
            Ir al inicio
          </button>
        </div>
      </main>
    );
  }
}
