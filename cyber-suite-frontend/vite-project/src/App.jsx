// src/App.jsx
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import React, { lazy, Suspense, useEffect } from 'react';
import Navbar from "./components/Navbar";

// Lazy load route components
const Home = lazy(() => import("./pages/Home"));
const PasswordAnalyzer = lazy(() => import("./pages/PasswordAnalyzer"));
const VulnerabilityScan = lazy(() => import("./pages/VulnerabilityScan"));
const BreachChecker = lazy(() => import("./pages/BreachChecker"));
const NotFound = lazy(() => import("./pages/NotFound"));

// Loading component
const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-900 via-indigo-900 to-black" style={{ contain: 'content' }}>
    <div className="animate-pulse text-white text-lg md:text-xl">Loading...</div>
  </div>
);

// Memoize the Navbar component to prevent unnecessary re-renders
const MemoizedNavbar = React.memo(Navbar);

export default function App() {
  useEffect(() => {
    // Add performance monitoring
    if ('performance' in window) {
      window.performance.mark('app-init');
    }

    // Preload critical pages
    const preloadPages = () => {
      const pagesToPreload = [Home, PasswordAnalyzer];
      pagesToPreload.forEach(page => {
        try {
          page.preload?.();
        } catch (error) {
          console.error('Error preloading page:', error);
        }
      });
    };

    // Preload after initial render
    const timer = setTimeout(preloadPages, 2000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <Router>
      <MemoizedNavbar />
      <main className="pt-16 overflow-x-hidden" style={{ contain: 'paint layout' }}> {/* Add padding and optimize paint/layout */}
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/password-analyzer" element={<PasswordAnalyzer />} />
            <Route path="/vulnerability-scan" element={<VulnerabilityScan />} />
            <Route path="/breach-checker" element={<BreachChecker />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </main>
    </Router>
  );
}
