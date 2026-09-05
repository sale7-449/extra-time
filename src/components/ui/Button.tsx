import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cx } from "@/lib/utils";

type Variant = "primary" | "secondary" | "ghost";
type Size = "sm" | "md" | "lg";

const variantClasses: Record<Variant, string> = {
  primary:
    "bg-primary text-primary-ink hover:brightness-110 active:brightness-95 shadow-[var(--glow-primary)]",
  secondary:
    "bg-surface text-ink border border-border hover:border-primary/40 hover:bg-surface-2",
  ghost: "bg-transparent text-ink hover:bg-surface",
};

const sizeClasses: Record<Size, string> = {
  sm: "h-9 px-4 text-sm",
  md: "h-11 px-5 text-[15px]",
  lg: "h-13 px-7 text-base",
};

interface BaseProps {
  variant?: Variant;
  size?: Size;
  icon?: ReactNode;
  className?: string;
  children: ReactNode;
}

type ButtonProps = BaseProps &
  ButtonHTMLAttributes<HTMLButtonElement> & { href?: undefined; target?: undefined };

type LinkButtonProps = BaseProps & { href: string; target?: string };

export function Button({
  variant = "primary",
  size = "md",
  icon,
  className,
  children,
  href,
  target,
  ...rest
}: ButtonProps | LinkButtonProps) {
  const classes = cx(
    "inline-flex items-center justify-center gap-2 rounded-[var(--radius-sm)] font-bold transition-[filter,background-color,border-color] duration-150 disabled:opacity-40 disabled:pointer-events-none",
    variantClasses[variant],
    sizeClasses[size],
    className
  );

  if (href) {
    // target كان يُسقَط بصمت هنا (لم يكن يصل لعنصر Link إطلاقاً) — زر "قراءة
    // المقال الأصلي" في صفحة الخبر كان يفتح المصدر الخارجي في نفس التبويب
    // فعلياً رغم تمرير target="_blank"، فيفقد المستخدم موقعنا. rel الأمني
    // إلزامي تلقائياً مع أي target="_blank" (تبويب جديد يفتحه المصدر
    // الخارجي لا يجب أن يصل لـ window.opener الخاص بنا).
    return (
      <Link href={href} target={target} rel={target === "_blank" ? "noopener noreferrer" : undefined} className={classes}>
        {icon}
        {children}
      </Link>
    );
  }

  return (
    <button className={classes} {...(rest as ButtonHTMLAttributes<HTMLButtonElement>)}>
      {icon}
      {children}
    </button>
  );
}
