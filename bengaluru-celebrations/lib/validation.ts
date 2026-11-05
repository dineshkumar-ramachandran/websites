import { ValidationError } from "./errors";
import { isValidDateString, isValidTimeString } from "./time";

export const EVENT_TYPES = [
  { value: "birthday", label: "Birthday party" },
  { value: "engagement", label: "Engagement" },
  { value: "reception", label: "Reception" },
  { value: "baby_shower", label: "Baby shower / Seemantha" },
  { value: "naming_ceremony", label: "Naming ceremony" },
  { value: "anniversary", label: "Anniversary" },
  { value: "corporate", label: "Corporate gathering" },
  { value: "other", label: "Other" },
] as const;
export const EVENT_TYPE_VALUES: string[] = EVENT_TYPES.map((e) => e.value);
export function eventTypeLabel(v: string, other?: string) {
  if (v === "other" && other) return `Other: ${other}`;
  return EVENT_TYPES.find((e) => e.value === v)?.label ?? v;
}

/** Collects field errors and throws one ValidationError at the end. */
export class Checker {
  errors: Record<string, string> = {};
  constructor(private input: Record<string, unknown>) {}

  private raw(name: string) {
    return this.input?.[name];
  }
  fail(name: string, msg: string) {
    if (!this.errors[name]) this.errors[name] = msg;
  }

  str(name: string, opts: { required?: boolean; min?: number; max?: number; label?: string; pattern?: RegExp; patternMsg?: string } = {}): string {
    const label = opts.label ?? name;
    const v = this.raw(name);
    if (v === undefined || v === null || v === "") {
      if (opts.required) this.fail(name, `${label} is required.`);
      return "";
    }
    if (typeof v !== "string") {
      this.fail(name, `${label} must be text.`);
      return "";
    }
    const s = v.trim();
    if (opts.required && s.length === 0) this.fail(name, `${label} is required.`);
    if (opts.min && s.length < opts.min) this.fail(name, `${label} must be at least ${opts.min} characters.`);
    if (opts.max && s.length > opts.max) this.fail(name, `${label} must be at most ${opts.max} characters.`);
    if (opts.pattern && s && !opts.pattern.test(s)) this.fail(name, opts.patternMsg ?? `${label} is not valid.`);
    return s;
  }

  int(name: string, opts: { required?: boolean; min?: number; max?: number; label?: string } = {}): number {
    const label = opts.label ?? name;
    const v = this.raw(name);
    if (v === undefined || v === null || v === "") {
      if (opts.required) this.fail(name, `${label} is required.`);
      return NaN;
    }
    const n = typeof v === "number" ? v : Number(v);
    if (!Number.isInteger(n)) {
      this.fail(name, `${label} must be a whole number.`);
      return NaN;
    }
    if (opts.min !== undefined && n < opts.min) this.fail(name, `${label} must be at least ${opts.min}.`);
    if (opts.max !== undefined && n > opts.max) this.fail(name, `${label} must be at most ${opts.max}.`);
    return n;
  }

  bool(name: string): boolean {
    const v = this.raw(name);
    return v === true || v === "true" || v === "on" || v === "1";
  }

  date(name: string, opts: { required?: boolean; label?: string } = {}): string {
    const v = this.raw(name);
    if (v === undefined || v === null || v === "") {
      if (opts.required) this.fail(name, `${opts.label ?? name} is required.`);
      return "";
    }
    if (!isValidDateString(v)) {
      this.fail(name, `${opts.label ?? name} must be a valid date.`);
      return "";
    }
    return v;
  }

  time(name: string, opts: { required?: boolean; label?: string } = {}): string {
    const v = this.raw(name);
    if (v === undefined || v === null || v === "") {
      if (opts.required) this.fail(name, `${opts.label ?? name} is required.`);
      return "";
    }
    if (!isValidTimeString(v)) {
      this.fail(name, `${opts.label ?? name} must be a time like 17:00.`);
      return "";
    }
    return (v as string).slice(0, 5);
  }

  oneOf<T extends string>(name: string, values: readonly T[], opts: { required?: boolean; label?: string } = {}): T {
    const v = this.raw(name);
    if (v === undefined || v === null || v === "") {
      if (opts.required) this.fail(name, `${opts.label ?? name} is required.`);
      return "" as T;
    }
    if (typeof v !== "string" || !values.includes(v as T)) {
      this.fail(name, `${opts.label ?? name} is not a valid choice.`);
      return "" as T;
    }
    return v as T;
  }

  /** Indian mobile/landline: keeps digits and a leading +, requires 10–13 digits. */
  phone(name: string, opts: { required?: boolean; label?: string } = {}): string {
    const s = this.str(name, { required: opts.required, max: 20, label: opts.label ?? "Phone number" });
    if (!s) return "";
    const cleaned = s.replace(/[\s()-]/g, "");
    if (!/^\+?\d{10,13}$/.test(cleaned)) {
      this.fail(name, "Enter a valid phone number, e.g. 98450 12345 or +91 98450 12345.");
      return "";
    }
    return cleaned;
  }

  email(name: string, opts: { required?: boolean; label?: string } = {}): string {
    const s = this.str(name, { required: opts.required, max: 200, label: opts.label ?? "Email" });
    if (!s) return "";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s)) {
      this.fail(name, "Enter a valid email address.");
      return "";
    }
    return s.toLowerCase();
  }

  done() {
    if (Object.keys(this.errors).length) throw new ValidationError(this.errors);
  }
}

export function normalizePhone(p: string): string {
  const digits = p.replace(/\D/g, "");
  return digits.length > 10 ? digits.slice(-10) : digits;
}

export function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}
