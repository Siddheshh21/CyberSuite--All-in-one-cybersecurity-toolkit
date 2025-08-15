// src/App.jsx
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { lazy, Suspense } from 'react';
import Navbar from "./components/Navbar";

// Lazy load route components
const Home = lazy(() => import("./pages/Home"));
const PasswordAnalyzer = lazy(() => import("./pages/PasswordAnalyzer"));
const VulnerabilityScan = lazy(() => import("./pages/VulnerabilityScan"));
const BreachChecker = lazy(() => import("./pages/BreachChecker"));
const NotFound = lazy(() => import("./pages/NotFound"));

// Loading component
const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-900 via-indigo-900 to-black">
    <div className="animate-pulse text-white text-xl">Loading...</div>
  </div>
);

export default function App() {
  return (
    <Router>
      <Navbar />
      <main className="pt-16"> {/* Add padding to account for fixed navbar */}
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
