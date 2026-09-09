import type { ReactNode } from "react";
import {
  Dialog,
  DialogBackdrop,
  DialogPanel,
  DialogTitle,
  Switch,
} from "@headlessui/react";
import { XMarkIcon } from "@heroicons/react/24/outline";

export function classNames(...classes: (string | false | undefined | null)[]) {
  return classes.filter(Boolean).join(" ");
}

// ── Buttons ────────────────────────────────────────────────────────

type ButtonVariant = "primary" | "secondary" | "danger" | "ghost";

const buttonVariants: Record<ButtonVariant, string> = {
  primary:
    "bg-indigo-600 text-white shadow-xs hover:bg-indigo-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600",
  secondary:
    "bg-white text-gray-900 shadow-xs ring-1 ring-gray-300 ring-inset hover:bg-gray-50",
  danger:
    "bg-red-600 text-white shadow-xs hover:bg-red-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600",
  ghost: "text-gray-700 hover:bg-gray-100 hover:text-gray-900",
};

export function Button({
  variant = "primary",
  size = "md",
  className,
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: "sm" | "md";
}) {
  return (
    <button
      type="button"
      className={classNames(
        "flex items-center justify-center gap-x-2 rounded-md font-semibold",
        size === "sm" ? "px-2.5 py-1.5 text-xs/6" : "px-3 py-2 text-sm/6",
        "disabled:cursor-not-allowed disabled:opacity-60",
        buttonVariants[variant],
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}

// ── Form fields ─────────────────────────────────────────────────────

const inputClasses =
  "block w-full rounded-md bg-white px-3 py-1.5 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 sm:text-sm/6";

export function Field({
  label,
  required,
  hint,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div>
      <label className="block text-sm/6 font-medium text-gray-900">
        {label}
        {required && <span className="text-red-500"> *</span>}
      </label>
      <div className="mt-2">{children}</div>
      {hint && <p className="mt-1 text-xs/5 text-gray-500">{hint}</p>}
    </div>
  );
}

export function Input({
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input className={classNames(inputClasses, className)} {...props} />;
}

export function Textarea({
  className,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={classNames(inputClasses, "min-h-24", className)}
      {...props}
    />
  );
}

export function Select({
  className,
  children,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={classNames(inputClasses, "pr-8", className)} {...props}>
      {children}
    </select>
  );
}

export function Toggle({
  checked,
  onChange,
  label,
  description,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  label?: string;
  description?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-x-4 py-3">
      {label && (
        <span className="text-sm/6">
          <span className="font-medium text-gray-900">{label}</span>
          {description && (
            <span className="block text-xs/5 text-gray-500">{description}</span>
          )}
        </span>
      )}
      <Switch
        checked={checked}
        onChange={onChange}
        className={classNames(
          checked ? "bg-indigo-600" : "bg-gray-200",
          "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors"
        )}
      >
        <span
          aria-hidden="true"
          className={classNames(
            checked ? "translate-x-5" : "translate-x-0",
            "pointer-events-none mt-0.5 ml-0.5 block size-4 rounded-full bg-white shadow-xs ring-0 transition"
          )}
        />
      </Switch>
    </div>
  );
}

// ── Layout ──────────────────────────────────────────────────────────

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-2 border-b border-gray-200 pb-6">
      <div>
        <h1 className="text-2xl/9 font-bold tracking-tight text-gray-900">{title}</h1>
        {subtitle && <p className="mt-1 text-sm/6 text-gray-500">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-x-3">{actions}</div>}
    </div>
  );
}

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div
      className={classNames(
        "rounded-xl bg-white shadow-xs ring-1 ring-gray-900/5",
        className
      )}
    >
      {children}
    </div>
  );
}

export function StatCard({
  name,
  value,
  icon,
  hint,
  tone = "neutral",
}: {
  name: string;
  value: ReactNode;
  icon?: ReactNode;
  hint?: ReactNode;
  tone?: "neutral" | "success" | "warning" | "danger";
}) {
  const toneClasses = {
    neutral: "bg-indigo-50 text-indigo-600",
    success: "bg-green-50 text-green-600",
    warning: "bg-yellow-50 text-yellow-600",
    danger: "bg-red-50 text-red-600",
  }[tone];

  return (
    <Card className="p-6">
      <div className="flex items-center gap-x-4">
        {icon && (
          <div className={classNames("flex size-10 items-center justify-center rounded-lg", toneClasses)}>
            {icon}
          </div>
        )}
        <div className="min-w-0">
          <p className="text-sm/6 font-medium text-gray-500 truncate">{name}</p>
          <p className="mt-1 text-3xl font-semibold tracking-tight text-gray-900">{value}</p>
          {hint && <p className="mt-1 text-xs/5 text-gray-500">{hint}</p>}
        </div>
      </div>
    </Card>
  );
}

// ── Badge ──────────────────────────────────────────────────────────

type BadgeTone = "green" | "yellow" | "red" | "gray" | "blue";

const badgeTones: Record<BadgeTone, string> = {
  green: "bg-green-50 text-green-700 ring-green-600/20",
  yellow: "bg-yellow-50 text-yellow-800 ring-yellow-600/20",
  red: "bg-red-50 text-red-700 ring-red-600/20",
  gray: "bg-gray-50 text-gray-600 ring-gray-500/20",
  blue: "bg-blue-50 text-blue-700 ring-blue-600/20",
};

export function Badge({
  tone = "gray",
  children,
  className,
}: {
  tone?: BadgeTone;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={classNames(
        "inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset",
        badgeTones[tone],
        className
      )}
    >
      {children}
    </span>
  );
}

// ── Modal ──────────────────────────────────────────────────────────

export function Modal({
  open,
  onClose,
  title,
  children,
  wide,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  wide?: boolean;
}) {
  return (
    <Dialog open={open} onClose={onClose} className="relative z-50">
      <DialogBackdrop
        transition
        className="fixed inset-0 bg-gray-900/50 transition-opacity duration-300 ease-linear data-closed:opacity-0"
      />
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <DialogPanel
          transition
          className={classNames(
            "w-full rounded-xl bg-white p-6 shadow-2xl transition duration-200 ease-out data-closed:scale-95 data-closed:opacity-0",
            wide ? "max-w-2xl" : "max-w-md"
          )}
        >
          <div className="flex items-start justify-between gap-x-4">
            <DialogTitle className="text-lg font-semibold text-gray-900">{title}</DialogTitle>
            <button
              type="button"
              onClick={onClose}
              className="-m-2 rounded-md p-2 text-gray-400 hover:bg-gray-50 hover:text-gray-600"
            >
              <span className="sr-only">Close</span>
              <XMarkIcon aria-hidden="true" className="size-5" />
            </button>
          </div>
          <div className="mt-6">{children}</div>
        </DialogPanel>
      </div>
    </Dialog>
  );
}

// ── Table ──────────────────────────────────────────────────────────

export function Table({ children }: { children: ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-xl bg-white shadow-xs ring-1 ring-gray-900/5">
      <table className="min-w-full divide-y divide-gray-200">{children}</table>
    </div>
  );
}

export function Th({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <th
      scope="col"
      className={classNames(
        "px-4 py-3.5 text-left text-xs/5 font-semibold text-gray-500 uppercase tracking-wider",
        className
      )}
    >
      {children}
    </th>
  );
}

export function Td({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <td className={classNames("px-4 py-4 text-sm/6 text-gray-900", className)}>
      {children}
    </td>
  );
}

// ── Empty state ────────────────────────────────────────────────────

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center rounded-xl bg-white px-6 py-16 text-center shadow-xs ring-1 ring-gray-900/5">
      {icon && (
        <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-gray-50 text-gray-400">
          {icon}
        </div>
      )}
      <h3 className="mt-4 text-sm/6 font-semibold text-gray-900">{title}</h3>
      {description && <p className="mt-1 max-w-sm text-sm/6 text-gray-500">{description}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

// ── Inline alert ────────────────────────────────────────────────────

export function Alert({
  tone = "info",
  children,
}: {
  tone?: "info" | "success" | "error" | "warning";
  children: ReactNode;
}) {
  const tones = {
    info: "bg-blue-50 text-blue-800 ring-blue-600/20",
    success: "bg-green-50 text-green-800 ring-green-600/20",
    error: "bg-red-50 text-red-800 ring-red-600/20",
    warning: "bg-yellow-50 text-yellow-800 ring-yellow-600/20",
  }[tone];

  return (
    <div className={classNames("rounded-md px-4 py-3 text-sm/6 ring-1 ring-inset", tones)}>
      {children}
    </div>
  );
}
