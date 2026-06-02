import { cn } from '@/lib/utils'

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  error?: string
  label?: string
  options: { value: string; label: string }[]
  placeholder?: string
}

export function Select({ className, error, label, id, options, placeholder, ...props }: SelectProps) {
  return (
    <div className="space-y-1">
      {label && (
        <label htmlFor={id} className="text-[11px] font-semibold tracking-wide uppercase text-muted-foreground">
          {label}
        </label>
      )}
      <select
        id={id}
        className={cn(
          'w-full border border-border bg-surface px-3 py-2 text-sm outline-none',
          'focus:border-primary focus:ring-1 focus:ring-primary/30',
          'disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-muted',
          error && 'border-danger focus:border-danger focus:ring-danger/20',
          className
        )}
        {...props}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      {error && <p className="text-[11px] text-danger">{error}</p>}
    </div>
  )
}
