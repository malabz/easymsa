import type { ButtonHTMLAttributes, AnchorHTMLAttributes } from "react";
import { Link, type LinkProps } from "react-router-dom";
import { cn } from "../../lib/utils/cn";

type Variant = "primary" | "secondary" | "ghost" | "outline";
type Size = "sm" | "md" | "lg";

const variantClasses: Record<Variant, string> = {
  primary:
    "bg-cyan-700 text-white shadow-sm hover:bg-cyan-800 focus-visible:ring-cyan-600",
  secondary:
    "bg-slate-900 text-white shadow-sm hover:bg-slate-800 focus-visible:ring-slate-700",
  ghost:
    "text-slate-700 hover:bg-slate-100 hover:text-slate-950 focus-visible:ring-slate-400",
  outline:
    "border border-slate-300 bg-white text-slate-800 shadow-sm hover:border-cyan-500 hover:text-cyan-800 focus-visible:ring-cyan-500"
};

const sizeClasses: Record<Size, string> = {
  sm: "h-9 px-3 text-sm",
  md: "h-10 px-4 text-sm",
  lg: "h-11 px-5 text-base"
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
    "inline-flex items-center justify-center gap-2 rounded-md font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-55",
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
