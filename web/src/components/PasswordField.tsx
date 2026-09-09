import { useState } from "react";
import { CheckCircleIcon } from "@heroicons/react/24/solid";
import { EyeIcon, EyeSlashIcon } from "@heroicons/react/24/outline";
import { classNames } from "./ui";

// ── Pure strength function (ported from HookForms Pro) ──────────────

export interface PasswordStrengthResult {
  level: "weak" | "fair" | "good" | "strong";
  score: number;
  checks: {
    length: boolean;
    lowercase: boolean;
    uppercase: boolean;
    digit: boolean;
  };
}

export function passwordStrength(pwd: string): PasswordStrengthResult {
  const checks = {
    length: pwd.length >= 8,
    lowercase: /[a-z]/.test(pwd),
    uppercase: /[A-Z]/.test(pwd),
    digit: /[0-9]/.test(pwd),
  };

  const score = [checks.length, checks.lowercase, checks.uppercase, checks.digit].filter(
    Boolean
  ).length;

  let level: PasswordStrengthResult["level"];
  if (score <= 1) level = "weak";
  else if (score === 2) level = "fair";
  else if (score === 3) level = "good";
  else level = "strong";

  return { level, score, checks };
}

const strengthBarClass: Record<PasswordStrengthResult["level"], string> = {
  weak: "bg-red-500",
  fair: "bg-orange-400",
  good: "bg-yellow-400",
  strong: "bg-green-500",
};

const strengthTextClass: Record<PasswordStrengthResult["level"], string> = {
  weak: "text-red-500",
  fair: "text-orange-400",
  good: "text-yellow-600",
  strong: "text-green-500",
};

// ── Input with eye toggle ───────────────────────────────────────────

function PasswordInput({
  id,
  value,
  onChange,
  placeholder,
  autoComplete,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  autoComplete?: string;
}) {
  const [show, setShow] = useState(false);

  return (
    <div className="relative">
      <input
        id={id}
        type={show ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        className="block w-full rounded-md bg-white px-3 py-1.5 pr-10 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 sm:text-sm/6"
      />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        aria-label={show ? "Hide password" : "Show password"}
        className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-gray-400 hover:text-gray-600 focus:outline-none"
      >
        {show ? <EyeSlashIcon className="size-4.5" /> : <EyeIcon className="size-4.5" />}
      </button>
    </div>
  );
}

function Label({ htmlFor, children, required }: { htmlFor: string; children: React.ReactNode; required?: boolean }) {
  return (
    <label htmlFor={htmlFor} className="mb-1.5 block text-sm font-medium text-gray-700">
      {children}
      {required && <span className="text-red-500"> *</span>}
    </label>
  );
}

// ── Field with strength + confirm (HookForms Pro pattern) ───────────

export function PasswordField({
  name,
  label,
  placeholder,
  required,
  showStrength = false,
  showConfirm = false,
  confirmLabel = "Confirm password",
  confirmPlaceholder = "Re-enter your password",
  value,
  onChange,
  onValidityChange,
  autoComplete,
}: {
  name: string;
  label: string;
  placeholder?: string;
  required?: boolean;
  showStrength?: boolean;
  showConfirm?: boolean;
  confirmLabel?: string;
  confirmPlaceholder?: string;
  value: string;
  onChange: (value: string) => void;
  onValidityChange?: (valid: boolean) => void;
  autoComplete?: string;
}) {
  const [confirmValue, setConfirmValue] = useState("");

  const strength = passwordStrength(value);
  const matching = !showConfirm || (confirmValue.length > 0 && value === confirmValue);
  const valid = strength.score === 4 && matching;

  const handleConfirmChange = (v: string) => {
    setConfirmValue(v);
    onValidityChange?.(strength.score === 4 && v.length > 0 && value === v);
  };

  const handleValueChange = (v: string) => {
    onChange(v);
    onValidityChange?.(
      strength.score === 4 && (!showConfirm || (confirmValue.length > 0 && v === confirmValue))
    );
  };

  return (
    <div>
      <Label htmlFor={name} required={required}>
        {label}
      </Label>

      <PasswordInput
        id={name}
        value={value}
        onChange={handleValueChange}
        placeholder={placeholder}
        autoComplete={autoComplete}
      />

      {showStrength && value.length > 0 && (
        <div className="mt-2">
          {/* Strength bar */}
          <div className="h-1.5 overflow-hidden rounded-full bg-gray-200">
            <div
              className={classNames(
                "h-full rounded-full transition-all duration-300 ease-out",
                strengthBarClass[strength.level]
              )}
              style={{ width: `${strength.score * 25}%` }}
            />
          </div>
          <p className={classNames("mt-1 text-xs capitalize", strengthTextClass[strength.level])}>
            {strength.level}
          </p>

          {/* Requirements checklist */}
          <ul className="mt-2 space-y-1">
            {(
              [
                ["length", "8+ characters"],
                ["lowercase", "A lowercase letter"],
                ["uppercase", "An uppercase letter"],
                ["digit", "A digit"],
              ] as const
            ).map(([key, text]) => (
              <li
                key={key}
                className={classNames(
                  "flex items-center gap-1.5 text-xs",
                  strength.checks[key] ? "text-green-600" : "text-gray-400"
                )}
              >
                <CheckCircleIcon
                  aria-hidden="true"
                  className={classNames(
                    "size-3.5",
                    strength.checks[key] ? "text-green-500" : "text-gray-300"
                  )}
                />
                {text}
              </li>
            ))}
          </ul>
        </div>
      )}

      {showConfirm && value.length > 0 && (
        <div className="mt-4 transition-opacity">
          <Label htmlFor={`${name}-confirm`}>{confirmLabel}</Label>
          <PasswordInput
            id={`${name}-confirm`}
            value={confirmValue}
            onChange={handleConfirmChange}
            placeholder={confirmPlaceholder}
          />
          {confirmValue && value !== confirmValue && (
            <p className="mt-1 text-xs text-red-500">Passwords do not match</p>
          )}
        </div>
      )}
    </div>
  );
}
