import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Controller, useForm } from 'react-hook-form'

const MESES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']

// Réplica del selector de meses de PuntosClienteSection, con el mismo
// cableado a react-hook-form.
//
// La primera versión usaba form.setValue() sobre un campo que nunca se
// registraba y lo leía con form.watch(): RHF no volvía a renderizar y las
// casillas no se marcaban nunca. Este test falla con aquel cableado y pasa
// con Controller, que sí registra el campo.
function FormularioDePrueba({
  onSubmit,
  inicial = null,
}: {
  onSubmit: (meses: number[] | null) => void
  inicial?: number[] | null
}) {
  const form = useForm<{ meses_vencimiento: number[] | null }>({
    defaultValues: { meses_vencimiento: inicial },
  })

  return (
    <form onSubmit={form.handleSubmit((d) => onSubmit(d.meses_vencimiento))}>
      <Controller
        control={form.control}
        name="meses_vencimiento"
        render={({ field }) => {
          const elegidos = field.value ?? []
          return (
            <div>
              {MESES.map((nombre, i) => {
                const mes = i + 1
                const marcado = elegidos.includes(mes)
                return (
                  <label key={mes} data-marcado={marcado}>
                    <input
                      type="checkbox"
                      checked={marcado}
                      onBlur={field.onBlur}
                      onChange={(e) =>
                        field.onChange(
                          e.target.checked
                            ? [...elegidos, mes].sort((a, b) => a - b)
                            : elegidos.filter((m) => m !== mes)
                        )
                      }
                    />
                    {nombre}
                  </label>
                )
              })}
            </div>
          )
        }}
      />
      <button type="submit">Guardar</button>
    </form>
  )
}

describe('selector de meses de vencimiento', () => {
  it('marca la casilla al hacer clic', async () => {
    const user = userEvent.setup()
    render(<FormularioDePrueba onSubmit={jest.fn()} />)

    const agosto = screen.getByLabelText('Ago')
    expect(agosto).not.toBeChecked()

    await user.click(agosto)
    expect(agosto).toBeChecked()
  })

  it('guarda los 5 anticipos de persona física en orden', async () => {
    const user = userEvent.setup()
    const onSubmit = jest.fn()
    render(<FormularioDePrueba onSubmit={onSubmit} />)

    for (const mes of ['Ago', 'Oct', 'Dic', 'Feb', 'Abr']) {
      await user.click(screen.getByLabelText(mes))
    }
    await user.click(screen.getByText('Guardar'))

    expect(onSubmit).toHaveBeenCalledWith([2, 4, 8, 10, 12])
  })

  it('destilda un mes ya marcado sin tocar los demás', async () => {
    const user = userEvent.setup()
    const onSubmit = jest.fn()
    render(<FormularioDePrueba onSubmit={onSubmit} inicial={[2, 4, 8, 10, 12]} />)

    expect(screen.getByLabelText('Ago')).toBeChecked()
    await user.click(screen.getByLabelText('Ago'))
    expect(screen.getByLabelText('Ago')).not.toBeChecked()

    await user.click(screen.getByText('Guardar'))
    expect(onSubmit).toHaveBeenCalledWith([2, 4, 10, 12])
  })

  it('llega con los meses ya marcados al editar una configuración existente', () => {
    render(<FormularioDePrueba onSubmit={jest.fn()} inicial={[1, 2, 3, 4, 5, 6, 7, 8, 9]} />)

    for (const mes of ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep']) {
      expect(screen.getByLabelText(mes)).toBeChecked()
    }
    for (const mes of ['Oct', 'Nov', 'Dic']) {
      expect(screen.getByLabelText(mes)).not.toBeChecked()
    }
  })
})
