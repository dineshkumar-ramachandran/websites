const fmt = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2, minimumFractionDigits: 0 });

/** Format integer paise as Indian rupees, e.g. 4500000 -> "₹45,000". */
export function formatINR(paise: number): string {
  return fmt.format(paise / 100);
}

export function rupeesToPaise(rupees: number): number {
  return Math.round(rupees * 100);
}

export function computeTax(amountPaise: number, taxPercent: number): number {
  return Math.round((amountPaise * taxPercent) / 100);
}
