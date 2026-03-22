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
  card: "rounded-[1.5rem] border border-slate-200 bg-white px-4 py-4 shadow-sm sm:px-5",
  pill: "rounded-full border border-slate-200 bg-white px-3 py-3 shadow-sm shadow-slate-200/60",
  "soft-pill":
    "rounded-full border border-slate-200 bg-slate-50/90 px-3 py-2 shadow-sm shadow-slate-200/20",
};

const CONTROL_SHELL_CLASSNAME = {
  bare: "flex min-w-0 flex-1 items-center gap-2",
  default: "flex h-11 items-center gap-2 rounded-full border border-slate-200 bg-white px-4",
  soft: "flex h-11 items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-4",
} as const;

const INPUT_CLASSNAME = {
  bare: "min-w-0 flex-1 bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400",
  default:
    "min-w-0 flex-1 bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400",
  soft: "min-w-0 flex-1 bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400",
} as const;

const SELECT_CLASSNAME = {
  default:
    "h-11 w-full rounded-full border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:bg-white focus:ring-2 focus:ring-slate-200",
  soft: "h-11 w-full rounded-full border border-slate-200 bg-slate-50 px-4 text-sm text-slate-900 outline-none transition focus:bg-white focus:ring-2 focus:ring-slate-200",
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
        "inline-flex items-center justify-center rounded-full text-sm font-medium transition",
        size === "hero" ? "px-5 py-2.5" : "h-11 px-5",
        tone === "primary"
          ? "bg-slate-950 text-white hover:bg-slate-800"
          : "border border-slate-300 bg-white text-slate-800 hover:border-slate-400 hover:bg-slate-50",
        className,
      )}
    >
      {children}
    </button>
  );
}

export default SearchToolbar;
