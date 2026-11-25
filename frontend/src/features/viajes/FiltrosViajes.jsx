import Button from '../../components/ui/Button.jsx'
import Input from '../../components/ui/Input.jsx'

export default function FiltrosViajes({ filtros, onCambiar, onLimpiar }) {
  return (
    <div className="filtros">
      <div className="field">
        <label className="field__label" htmlFor="filtro-estado">
          Estado
        </label>
        <select
          className="field__input"
          id="filtro-estado"
          value={filtros.estado}
          onChange={(evento) => onCambiar('estado', evento.target.value)}
        >
          <option value="">Todos</option>
          <option value="pendiente">Pendiente</option>
          <option value="cancelado">Cancelado</option>
        </select>
      </div>

      <Input
        id="filtro-desde"
        label="Desde"
        type="date"
        value={filtros.desde}
        onChange={(evento) => onCambiar('desde', evento.target.value)}
      />

      <Input
        id="filtro-hasta"
        label="Hasta"
        type="date"
        value={filtros.hasta}
        onChange={(evento) => onCambiar('hasta', evento.target.value)}
      />

      <Button variant="ghost" onClick={onLimpiar}>
        Limpiar filtros
      </Button>
    </div>
  )
}
