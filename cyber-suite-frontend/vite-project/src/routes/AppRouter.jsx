import React from "react";
import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";
import PasswordAnalyzer from "../pages/PasswordAnalyzer";
import VulnerabilityScan from "../pages/VulnerabilityScan";
import BreachChecker from "../pages/BreachChecker";

function Navbar() {
  return (
    <nav className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-6 py-4 shadow-lg flex justify-between items-center">
      <h1 className="text-xl font-bold">CyberSuite</h1>
      <div className="space-x-4">
        <Link to="/" className="hover:underline">Home</Link>
        <Link to="/password-analyzer" className="hover:underline">Password Analyzer</Link>
        <Link to="/vulnerability-scan" className="hover:underline">Vulnerability Scan</Link>
        <Link to="/breach-checker" className="hover:underline">Breach Checker</Link>
      </div>
    </nav>
  );
}

export default function AppRouter() {
  return (
    <Router>
      <Navbar />
      <div className="p-6">
        <Routes>
          <Route path="/" element={
            <div className="text-center mt-20">
              <h1 className="text-4xl font-bold text-gray-800">Welcome to CyberSuite</h1>
              <p className="text-gray-600 mt-4">Your all-in-one cybersecurity toolkit.</p>

              {/* Home quick cards (Breach Checker highlight) */}
              <div className="max-w-4xl mx-auto mt-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Link to="/password-analyzer" className="block p-4 rounded-lg bg-white shadow hover:shadow-lg">
                  <h3 className="font-semibold text-gray-800">Password Analyzer</h3>
                  <p className="text-sm text-gray-500 mt-1">Analyze password strength, entropy & reuse risk.</p>
                </Link>

                <Link to="/breach-checker" className="block p-4 rounded-lg bg-gradient-to-r from-slate-800 to-slate-700 text-white shadow hover:shadow-lg">
                  <h3 className="font-semibold">Email Breach Checker</h3>
                  <p className="text-sm mt-1">Scan your email across breach feeds and get remediation steps.</p>
                </Link>
              </div>
            </div>
          } />
          <Route path="/password-analyzer" element={<PasswordAnalyzer />} />
          <Route path="/vulnerability-scan" element={<VulnerabilityScan />} />
          <Route path="/breach-checker" element={<BreachChecker />} />
        </Routes>
      </div>
    </Router>
  );
}

