// src/services/api.js
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export async function checkPasswordStrength(password) {
  const res = await fetch(`${API_BASE_URL}/password-strength`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password }),
  });

  if (!res.ok) throw new Error("Failed to analyze password");
  return res.json();
}
