// src/utils/breachUtils.js
export function isValidEmail(email){
  if (!email || typeof email !== "string") return false;
  const s = email.trim();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}

export function timeSinceFromISO(iso){
  if (!iso) return "Unknown";
  const a = new Date(iso), b = new Date();
  const months = (b.getFullYear() - a.getFullYear())*12 + (b.getMonth() - a.getMonth());
  if (isNaN(months)) return "Unknown";
  if (months < 1) return "Less than a month ago";
  if (months === 1) return "About 1 month ago";
  if (months < 12) return `About ${months} months ago`;
  const yrs = Math.floor(months/12), rem = months%12;
  if (rem === 0) return `About ${yrs} year${yrs>1?"s":""} ago`;
  return `About ${yrs}y ${rem}m ago`;
}
