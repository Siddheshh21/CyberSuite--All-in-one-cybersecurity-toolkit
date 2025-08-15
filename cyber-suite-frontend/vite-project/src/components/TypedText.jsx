import { useEffect, useRef } from 'react';
import Typed from 'typed.js';

export default function TypedText({ strings, typeSpeed = 50, startDelay = 0, showCursor = true, cursorChar = '_' }) {
  const el = useRef(null);
  const typed = useRef(null);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;

    if (!el.current) return;

    const options = {
      strings,
      typeSpeed,
      startDelay,
      showCursor,
      cursorChar,
      backSpeed: 50,
      backDelay: 1500,
      loop: false,
      onBegin: () => {
        if (!mounted.current) return;
      },
      onComplete: () => {
        if (!mounted.current) return;
      }
    };

    // Cleanup previous instance if it exists
    if (typed.current) {
      typed.current.destroy();
    }

    // Small delay to ensure DOM is ready
    const timer = setTimeout(() => {
      if (mounted.current && el.current) {
        typed.current = new Typed(el.current, options);
      }
    }, 50);

    return () => {
      mounted.current = false;
      clearTimeout(timer);
      if (typed.current) {
        typed.current.destroy();
      }
    };
  }, [strings, typeSpeed, startDelay, showCursor, cursorChar]);

  return <span ref={el} />;
}