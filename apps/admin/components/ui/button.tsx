import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import type { ComponentProps } from 'react';

import { cn } from '@/lib/utils';

// shadcn/ui Button, restyled to the black-and-white tokens.
const buttonVariants = cva(
  'inline-flex min-h-11 items-center justify-center gap-2 rounded-box px-4 text-sm font-semibold transition-opacity disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink',
  {
    variants: {
      variant: {
        primary: 'bg-ink text-paper hover:opacity-80',
        secondary: 'border border-ink bg-paper text-ink hover:bg-grey-100',
        ghost: 'text-ink underline hover:bg-grey-100',
        danger: 'border-2 border-ink bg-paper text-ink hover:bg-grey-100',
      },
    },
    defaultVariants: { variant: 'primary' },
  },
);

export function Button({
  className,
  variant,
  asChild = false,
  ...props
}: ComponentProps<'button'> & VariantProps<typeof buttonVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : 'button';
  return <Comp className={cn(buttonVariants({ variant }), className)} {...props} />;
}
