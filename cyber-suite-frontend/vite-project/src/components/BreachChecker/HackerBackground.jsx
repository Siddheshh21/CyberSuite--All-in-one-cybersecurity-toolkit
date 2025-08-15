import React from "react";

export default function HackerBackground({ loading = false }){
  return (
    <>
      {/* terminal lines */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="w-full h-full opacity-5 bg-[linear-gradient(180deg,transparent_0%,rgba(0,0,0,0.02)_2%)] bg-repeat-y" style={{ backgroundSize: "100% 6px" }} />
      </div>

      {/* subtle gradient overlay */}
      <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse at 10% 90%, rgba(99,102,241,0.03), transparent 10%)" }} />

      {/* scanning radar while loading */}
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div
            className="w-48 h-48 rounded-full"
            style={{
              background: "radial-gradient(circle at 30% 30%, rgba(99,102,241,0.12), transparent 10%)",
              animation: "spin 3s linear infinite"
            }}
          />
        </div>
      )}

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .loader-dots > div { display:inline-block; width:8px; height:8px; margin:0 3px; background:currentColor; border-radius:9999px; animation: dot 1s infinite ease-in-out; }
        .loader-dots > div:nth-child(2){ animation-delay: 0.15s; } .loader-dots > div:nth-child(3){ animation-delay: 0.3s; }
        @keyframes dot { 0%,80%,100%{ transform: scale(0.5); opacity:0.4 } 40%{ transform: scale(1); opacity:1 } }
      `}</style>
    </>
  );
}
