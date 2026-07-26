import * as React from "react"
import { cn } from "../../lib/utils"

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', ...props }, ref) => {
    const baseStyles = "inline-flex items-center justify-center rounded-button font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:pointer-events-none disabled:opacity-50 touch-manipulation active:scale-[0.98]";
    
    const variants = {
      primary: "bg-primary text-white hover:bg-primary-dark shadow-sm",
      secondary: "bg-surface text-text-main border border-gray-200 hover:bg-gray-50 shadow-sm",
      outline: "border border-primary text-primary hover:bg-primary/10",
      ghost: "hover:bg-gray-100 hover:text-text-main text-text-muted",
    };

    const sizes = {
      sm: "h-9 px-3 text-xs min-h-[36px]",
      md: "h-11 md:h-10 px-4 py-2 text-sm min-h-[44px]",
      lg: "h-12 px-6 text-base min-h-[48px]",
    };

    return (
      <button
        ref={ref}
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button }
