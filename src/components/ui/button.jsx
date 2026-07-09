import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva } from "class-variance-authority";

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md font-heading font-semibold border-2 border-ink transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 active:translate-x-[2px] active:translate-y-[2px] active:shadow-none",
  {
    variants: {
      variant: {
        default:
          "bg-ink text-paper shadow-hard hover:bg-ink/90",
        destructive:
          "bg-stamp text-white border-stamp shadow-hard-sm hover:bg-stamp/90",
        outline:
          "border-2 border-ink bg-card text-ink shadow-hard-sm hover:bg-paper",
        secondary:
          "bg-paper text-ink border-ink shadow-hard-sm hover:bg-paper/80",
        money:
          "bg-money text-white border-ink shadow-hard hover:bg-money/90",
        signal:
          "bg-signal text-white font-bold border-ink shadow-hard hover:bg-signal/90",
        ghost: "border-transparent shadow-none hover:bg-paper text-ink",
        link: "text-ink border-transparent shadow-none underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-5 py-2 text-sm",
        sm: "h-9 rounded-md px-3 text-xs",
        lg: "h-12 rounded-md px-8 text-base",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

const Button = React.forwardRef(({ className, variant, size, asChild = false, ...props }, ref) => {
  const Comp = asChild ? Slot : "button"
  return (
    (<Comp
      className={cn(buttonVariants({ variant, size, className }))}
      ref={ref}
      {...props} />)
  );
})
Button.displayName = "Button"

export { Button, buttonVariants }