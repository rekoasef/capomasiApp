import { cn } from '@/lib/utils'

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: string
  label?: string
}

export function Input({ className, error, label, id, ...props }: InputProps) {
  return (
    <div className="space-y-1">
      {label && (
        <label htmlFor={id} className="text-[11px] font-semibold tracking-wide uppercase text-muted-foreground">
          {label}
        </label>
      )}
      <input
        id={id}
        className={cn(
          'w-full border border-border bg-surface px-3 py-2 text-sm outline-none',
          'placeholder:text-muted-foreground/60',
          'focus:border-primary focus:ring-1 focus:ring-primary/30',
          'disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-muted',
          error && 'border-danger focus:border-danger focus:ring-danger/20',
          className
        )}
        {...props}
      />
      {error && <p className="text-[11px] text-danger">{error}</p>}
    </div>
  )
}
