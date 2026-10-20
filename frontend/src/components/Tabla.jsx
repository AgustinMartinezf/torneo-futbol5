// columnas: [{ campo, titulo, mostrar? }]. mostrar(fila) permite formatear la celda.
// acciones(fila): botones de la última columna (editar, borrar...).
export default function Tabla({ columnas, filas, clave, acciones, vacio = 'No hay datos para mostrar.' }) {
  if (filas.length === 0) return <p className="vacio">{vacio}</p>

  return (
    <table className="tabla">
      <thead>
        <tr>
          {columnas.map((c) => <th key={c.campo}>{c.titulo}</th>)}
          {acciones && <th>Acciones</th>}
        </tr>
      </thead>
      <tbody>
        {filas.map((fila) => (
          <tr key={fila[clave]}>
            {columnas.map((c) => (
              <td key={c.campo}>{c.mostrar ? c.mostrar(fila) : fila[c.campo]}</td>
            ))}
            {acciones && <td className="acciones">{acciones(fila)}</td>}
          </tr>
        ))}
      </tbody>
    </table>
  )
}
