import React, { useEffect } from "react";
// Micro-interactions: typing animation, sound, card effects
export default function MicroInteractions({ loading, found }) {
  useEffect(() => {
    if (!loading && found !== undefined) {
      const audio = new Audio(found ? "/sounds/alert.mp3" : "/sounds/ding.mp3");
      audio.volume = 0.3;
      audio.play();
    }
  }, [loading, found]);
  return (
    <div className="w-full flex items-center justify-center mt-4">
      {loading ? (
        <div className="flex gap-2 text-lg font-mono text-indigo-400 animate-pulse">
          <span>Scanning</span>
          <span className="animate-bounce">.</span>
          <span className="animate-bounce delay-150">.</span>
          <span className="animate-bounce delay-300">.</span>
        </div>
      ) : null}
    </div>
  );
}
