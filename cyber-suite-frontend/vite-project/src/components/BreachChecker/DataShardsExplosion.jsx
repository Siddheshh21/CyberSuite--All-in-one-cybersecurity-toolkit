import React, { useRef, useEffect, useState } from "react";
import gsap from "gsap";

const BREACH_NODES = [
  { x: 60, y: 40, label: "HaveIBeenPwned", url: "https://haveibeenpwned.com/" },
  { x: 240, y: 30, label: "XposedOrNot", url: "https://xposedornot.com/" },
  { x: 300, y: 120, label: "CyberNews", url: "https://cybernews.com/personal-data-leak-check/" },
  { x: 220, y: 220, label: "Dehashed", url: "https://www.dehashed.com/" },
  { x: 80, y: 220, label: "LeakCheck", url: "https://leakcheck.io/" }
];


export default function DataShardsExplosion({ found, email }) {
  const svgRef = useRef();
  useEffect(() => {
    // Animate shards explosion automatically on mount or email change
    const tl = gsap.timeline();
    BREACH_NODES.forEach((node, i) => {
      tl.to(`#shard${i}`, {
        x: node.x - 170,
        y: node.y - 120,
        opacity: 1,
        duration: 0.7,
        ease: "power2.out"
      }, 0.1 * i);
    });
    tl.to("#emailCircle", { opacity: 0.3, duration: 0.5 }, 0.2);
    BREACH_NODES.forEach((node, i) => {
      tl.to(`#breachNode${i}`, { opacity: found ? 1 : 0.5, fill: found ? "#ff2d55" : "#10b981", duration: 0.5 }, 0.7);
    });
    if (found) {
      BREACH_NODES.forEach((node, i) => {
        tl.to(`#attackLine${i}`, { opacity: 1 }, 1.1 + 0.1 * i);
      });
    } else {
      tl.to("#shield", { opacity: 1, scale: 1.1, duration: 0.7, ease: "elastic.out(1,0.5)" }, 1.2);
    }
    return () => tl.kill();
  }, [email, found]);

  return (
    <div className="w-full flex flex-col items-center justify-center">
      <svg ref={svgRef} width={340} height={260} style={{borderRadius: "24px", background: "#18181b", boxShadow: "0 0 32px #222"}}>
        {/* Email node */}
        <circle id="emailCircle" cx={170} cy={120} r={32} fill="#6366f1" opacity="1" />
        <text x={170} y={125} textAnchor="middle" fill="#fff" fontSize="16" fontWeight="bold">{email || "Your Email"}</text>
        {/* Data shards - animated circles moving to breach nodes */}
        {BREACH_NODES.map((node, i) => (
          <circle key={i} id={`shard${i}`} cx={170} cy={120} r={7} fill="#60a5fa" opacity="0.8" />
        ))}
        {/* Breach nodes - clickable, with source links */}
        {BREACH_NODES.map((node, i) => (
          <a key={"b"+i} href={node.url} target="_blank" rel="noopener noreferrer">
            <circle id={`breachNode${i}`} cx={node.x} cy={node.y} r={16} fill="#222" opacity="0.5" style={{cursor: 'pointer'}} />
          </a>
        ))}
        {/* Breach node labels with hyperlinks */}
        {BREACH_NODES.map((node, i) => (
          <a key={"l"+i} href={node.url} target="_blank" rel="noopener noreferrer">
            <text x={node.x} y={node.y+32} textAnchor="middle" fill="#60a5fa" fontSize="12" style={{cursor: 'pointer', textDecoration: 'underline'}}>{node.label}</text>
          </a>
        ))}
        {/* Attack lines */}
        {found && BREACH_NODES.map((node, i) => (
          <line key={"a"+i} id={`attackLine${i}`} x1={node.x} y1={node.y} x2={170} y2={120} stroke="#ff2d55" strokeWidth="4" opacity="0" />
        ))}
        {/* Shield for safe */}
        {!found && <circle id="shield" cx={170} cy={120} r={44} fill="#10b981" opacity="0.15" />}
      </svg>
      <div className="mt-2 text-base text-gray-300 font-mono text-center">
        {found
          ? "Breach detected! Data shards show attack paths from trusted sources."
          : "No breach found. Your data is shielded!"}
      </div>
      <div className="mt-1 text-xs text-gray-400 text-center">Your email is scanned visually. Shards represent analysis from multiple breach sources.</div>
    </div>
  );
}
