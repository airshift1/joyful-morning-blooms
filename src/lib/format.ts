export function formatMoney(cents: number | null | undefined): string {
  const n = typeof cents === "number" ? cents : 0;
  return (n / 100).toLocaleString("en-US", { style: "currency", currency: "USD" });
}

export function formatDate(d: string | Date): string {
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

export function formatDateTime(d: string | Date): string {
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });
}
