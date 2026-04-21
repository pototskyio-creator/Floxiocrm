import { type HTMLAttributes } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from './cn';

const badgeVariants = cva(
  'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
  {
    variants: {
      tone: {
        neutral: 'bg-neutral-100 text-neutral-700',
        open: 'bg-blue-100 text-blue-700',
        won: 'bg-emerald-100 text-emerald-700',
        lost: 'bg-rose-100 text-rose-700',
        pending: 'bg-amber-100 text-amber-700',
        done: 'bg-emerald-100 text-emerald-700',
        canceled: 'bg-neutral-100 text-neutral-500',
      },
    },
    defaultVariants: { tone: 'neutral' },
  }
);

export interface BadgeProps
  extends HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, tone, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ tone, className }))} {...props} />;
}
