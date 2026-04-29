import { cn } from "@/lib/utils";
import { type ButtonHTMLAttributes, forwardRef } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "destructive";
  size?: "sm" | "md" | "lg";
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed",
          {
            "bg-[var(--primary)] text-[var(--primary-foreground)] hover:opacity-90":
              variant === "primary",
            "bg-[var(--secondary)] text-[var(--secondary-foreground)] hover:bg-[var(--border)]":
              variant === "secondary",
            "text-[var(--foreground)] hover:bg-[var(--muted)]":
              variant === "ghost",
            "bg-[var(--destructive)] text-[var(--destructive-foreground)] hover:opacity-90":
              variant === "destructive",
          },
          {
            "px-2.5 py-1.5 text-xs": size === "sm",
            "px-4 py-2 text-sm": size === "md",
            "px-5 py-2.5 text-base": size === "lg",
          },
          className
        )}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";
