import React, { useEffect, useState } from "react";
// Rotating carousel of cybersecurity facts
const facts = [
  "81% of breaches are caused by weak or reused passwords.",
  "Enabling 2FA can block 99.9% of automated attacks.",
  "Phishing is responsible for over 90% of cyberattacks.",
  "Credential stuffing attacks use leaked passwords to access other accounts.",
  "Data breaches can lead to identity theft and financial loss."
];
export default function SecurityFactsCarousel() {
  const [idx, setIdx] = useState(0);
  const [displayed, setDisplayed] = useState("");
  useEffect(() => {
    const timer = setInterval(() => {
      setIdx(i => (i + 1) % facts.length);
    }, 3500);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => {
    setDisplayed("");
    let i = 0;
    const interval = setInterval(() => {
      setDisplayed(facts[idx].slice(0, i + 1));
      i++;
      if (i >= facts[idx].length) clearInterval(interval);
    }, 24);
    return () => clearInterval(interval);
  }, [idx]);
  return (
    <div className="rounded-xl bg-gradient-to-br from-indigo-900 to-indigo-700 text-white shadow-lg p-6 flex flex-col items-center justify-center min-h-[140px] animate-fade-in animate-glow">
      <div className="text-sm font-semibold tracking-wide mb-2">Did You Know?</div>
      <div className="text-lg text-center font-bold transition-opacity duration-700 ease-in-out">
        {displayed}
      </div>
    </div>
  );
}
