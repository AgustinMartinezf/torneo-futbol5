// Cuadro para confirmar una baja. Se muestra solo si abierto es true.
export default function ConfirmarBorrado({ abierto, mensaje, error, borrando, onConfirmar, onCancelar }) {
  if (!abierto) return null

  return (
    <div className="fondo-modal">
      <div className="modal" role="dialog" aria-modal="true">
        <p>{mensaje}</p>
        {error && <p className="error" role="alert">{error}</p>}
        <div className="botones">
          <button type="button" className="peligro" onClick={onConfirmar} disabled={borrando}>
            {borrando ? 'Borrando...' : 'Borrar'}
          </button>
          <button type="button" className="secundario" onClick={onCancelar} disabled={borrando}>
            Cancelar
          </button>
        </div>
      </div>
    </div>
  )
}
