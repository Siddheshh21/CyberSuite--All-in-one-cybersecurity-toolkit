import React from "react";
// Panel showing how hackers use breached emails
const uses = [
  "Send spam and phishing emails to your contacts.",
  "Use your credentials for credential stuffing attacks.",
  "Impersonate you for scams or fraud.",
  "Sell your data on dark web forums."
];
export default function HackerUsesPanel() {
  return (
    <div className="rounded-xl bg-gradient-to-br from-gray-900 to-gray-800 text-white shadow-lg p-6 flex flex-col items-center justify-center min-h-[140px] animate-fade-in animate-glow">
      <div className="text-sm font-semibold tracking-wide mb-2">How Hackers Could Use Your Email</div>
      <ul className="list-disc pl-6 text-base">
        {uses.map((u, i) => (
          <li key={i} className="mb-2 text-gray-200">{u}</li>
        ))}
      </ul>
    </div>
  );
}
