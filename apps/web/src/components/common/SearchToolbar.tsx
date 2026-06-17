import type {
  ButtonHTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
} from "react";

type SearchToolbarProps = {
  children: ReactNode;
  className?: string;
  surface?: "none" | "card" | "pill" | "soft-pill";
};

type SearchToolbarFieldProps = {
  children: ReactNode;
  label?: ReactNode;
  className?: string;
  compactLabel?: boolean;
};

type SearchToolbarInputProps = InputHTMLAttributes<HTMLInputElement> & {
  icon?: ReactNode;
  shellClassName?: string;
  inputClassName?: string;
  tone?: "bare" | "default" | "soft";
};

type SearchToolbarSelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
  className?: string;
  tone?: "default" | "soft";
};

type SearchToolbarButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  tone?: "primary" | "secondary";
  size?: "default" | "hero";
  className?: string;
};

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

const SURFACE_CLASSNAME: Record<NonNullable<SearchToolbarProps["surface"]>, string> = {
  none: "",
  card: "gv-premium-surface px-4 py-4 sm:px-5",
  pill: "gv-control-surface rounded-[20px] px-3 py-3",
  "soft-pill":
    "gv-control-surface rounded-[20px] px-3 py-2",
};

const CONTROL_SHELL_CLASSNAME = {
  bare: "flex min-w-0 flex-1 items-center gap-2",
  default: "gv-control-surface flex h-11 items-center gap-2 rounded-[14px] px-4",
  soft: "gv-control-surface flex h-11 items-center gap-2 rounded-[14px] px-4",
} as const;

const INPUT_CLASSNAME = {
  bare: "min-w-0 flex-1 bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400 dark:text-slate-100 dark:placeholder:text-slate-500",
  default:
    "min-w-0 flex-1 bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400 dark:text-slate-100 dark:placeholder:text-slate-500",
  soft: "min-w-0 flex-1 bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400 dark:text-slate-100 dark:placeholder:text-slate-500",
} as const;

const SELECT_CLASSNAME = {
  default:
    "gv-control-surface h-11 w-full rounded-[14px] px-4 text-sm text-slate-900 outline-none transition focus:ring-2 focus:ring-sky-200 dark:text-slate-100",
  soft: "gv-control-surface h-11 w-full rounded-[14px] px-4 text-sm text-slate-900 outline-none transition focus:ring-2 focus:ring-sky-200 dark:text-slate-100",
} as const;

export function SearchToolbar({
  children,
  className,
  surface = "none",
}: SearchToolbarProps) {
  return <div className={cx(SURFACE_CLASSNAME[surface], className)}>{children}</div>;
}

export function SearchToolbarField({
  children,
  label,
  className,
  compactLabel = false,
}: SearchToolbarFieldProps) {
  return (
    <div className={cx("space-y-2", className)}>
      {label ? (
        <p
          className={
            compactLabel
              ? "text-[11px] font-medium text-slate-500"
              : "text-[10px] font-medium uppercase tracking-[0.2em] text-slate-400"
          }
        >
          {label}
        </p>
      ) : null}
      {children}
    </div>
  );
}

export function SearchToolbarInput({
  icon,
  shellClassName,
  inputClassName,
  tone = "soft",
  ...props
}: SearchToolbarInputProps) {
  return (
    <div className={cx(CONTROL_SHELL_CLASSNAME[tone], shellClassName)}>
      {icon ? <span className="shrink-0 text-slate-400">{icon}</span> : null}
      <input {...props} className={cx(INPUT_CLASSNAME[tone], inputClassName)} />
    </div>
  );
}

export function SearchToolbarSelect({
  className,
  tone = "soft",
  children,
  ...props
}: SearchToolbarSelectProps) {
  return (
    <select {...props} className={cx(SELECT_CLASSNAME[tone], className)}>
      {children}
    </select>
  );
}

export function SearchToolbarButton({
  children,
  tone = "primary",
  size = "default",
  className,
  ...props
}: SearchToolbarButtonProps) {
  return (
    <button
      {...props}
      className={cx(
        size === "hero" ? "px-5 py-2.5" : "h-11 px-5",
        tone === "primary" ? "gv-primary-button" : "gv-secondary-button",
        className,
      )}
    >
      {children}
    </button>
  );
}

export default SearchToolbar;
