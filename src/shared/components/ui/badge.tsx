import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center px-2 py-0.5 text-[10px] font-bold tracking-widest uppercase',
  {
    variants: {
      variant: {
        default:     'bg-primary/15 text-[oklch(0.52_0.148_83)]',
        secondary:   'bg-muted text-muted-foreground',
        destructive: 'bg-danger/10 text-danger',
        outline:     'border border-border text-muted-foreground',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />
}

export { Badge, badgeVariants }
