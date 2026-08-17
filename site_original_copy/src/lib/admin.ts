export function getAdminEmails() {
  const rawValues = [import.meta.env.VITE_ADMIN_EMAIL, import.meta.env.VITE_OWNER_EMAIL];
  const emails = rawValues
    .filter(Boolean)
    .flatMap((value) => (typeof value === "string" ? value.split(",") : []))
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);

  if (emails.length === 0) {
    return ["joyfulmorningblooms@gmail.com"];
  }

  return Array.from(new Set(emails));
}

export function isAdminEmail(email?: string | null) {
  return !!email && getAdminEmails().includes(email.toLowerCase());
}
