// Formulario con el error general (por ejemplo el detail del back) y el botón de enviar.
// La validación del front la hace cada página antes de llamar al back.
export default function Formulario({ onSubmit, error, enviando, textoBoton = 'Guardar', onCancelar, children }) {
  function enviar(e) {
    e.preventDefault()
    onSubmit()
  }

  return (
    <form className="formulario" onSubmit={enviar} noValidate>
      {children}
      {error && <p className="error" role="alert">{error}</p>}
      <div className="botones">
        <button type="submit" disabled={enviando}>{enviando ? 'Enviando...' : textoBoton}</button>
        {onCancelar && <button type="button" className="secundario" onClick={onCancelar}>Cancelar</button>}
      </div>
    </form>
  )
}

// Campo con etiqueta y el error de validación de ese campo.
export function Campo({ etiqueta, nombre, error, tipo = 'text', valor, onChange, ...resto }) {
  return (
    <div className="campo">
      <label htmlFor={nombre}>{etiqueta}</label>
      <input
        id={nombre}
        name={nombre}
        type={tipo}
        value={valor}
        onChange={(e) => onChange(nombre, e.target.value)}
        aria-invalid={error ? 'true' : undefined}
        {...resto}
      />
      {error && <p className="error-campo">{error}</p>}
    </div>
  )
}
