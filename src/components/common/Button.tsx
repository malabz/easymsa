import type { ButtonHTMLAttributes, AnchorHTMLAttributes } from "react";
import { Link, type LinkProps } from "react-router-dom";
import { cn } from "../../lib/utils/cn";

type Variant = "primary" | "secondary" | "ghost" | "outline";
type Size = "sm" | "md" | "lg";

const variantClasses: Record<Variant, string> = {
  primary:
    "bg-teal-700 text-white shadow-sm hover:-translate-y-px hover:bg-teal-800 hover:shadow-md hover:shadow-teal-900/20 focus-visible:ring-teal-600",
  secondary:
    "bg-slate-900 text-white shadow-sm hover:bg-slate-800 focus-visible:ring-slate-700",
  ghost:
    "text-slate-700 hover:bg-slate-100 hover:text-slate-950 focus-visible:ring-slate-400",
  outline:
    "border border-slate-300 bg-white/70 text-slate-800 shadow-sm hover:border-teal-500 hover:text-teal-800 focus-visible:ring-teal-500"
};

const sizeClasses: Record<Size, string> = {
  sm: "min-h-[var(--control-compact-height)] px-3 text-sm",
  md: "min-h-[var(--control-height)] px-4 text-sm",
  lg: "min-h-[var(--control-touch-height)] px-5 text-base"
};

export function buttonClasses({
  variant = "primary",
  size = "md",
  className
}: {
  variant?: Variant;
  size?: Size;
  className?: string;
}) {
  return cn(
    "inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-md font-medium transition-[color,background-color,border-color,box-shadow,transform] duration-200 ease-out active:scale-[.97] active:duration-75 motion-reduce:transform-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-55 [&>svg]:shrink-0",
    variantClasses[variant],
    sizeClasses[size],
    className
  );
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
};

export function Button({
  className,
  variant = "primary",
  size = "md",
  ...props
}: ButtonProps) {
  return (
    <button
      className={buttonClasses({ variant, size, className })}
      type="button"
      {...props}
    />
  );
}

type ButtonLinkProps = LinkProps & {
  variant?: Variant;
  size?: Size;
};

export function ButtonLink({
  className,
  variant = "primary",
  size = "md",
  ...props
}: ButtonLinkProps) {
  return (
    <Link
      className={buttonClasses({ variant, size, className })}
      {...props}
    />
  );
}

type ExternalButtonLinkProps = AnchorHTMLAttributes<HTMLAnchorElement> & {
  variant?: Variant;
  size?: Size;
};

export function ExternalButtonLink({
  className,
  variant = "outline",
  size = "md",
  ...props
}: ExternalButtonLinkProps) {
  return (
    <a
      className={buttonClasses({ variant, size, className })}
      {...props}
    />
  );
}
