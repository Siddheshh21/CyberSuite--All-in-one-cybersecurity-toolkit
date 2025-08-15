
import { Link } from "react-router-dom";
import { FaLock, FaBug, FaDatabase, FaEnvelope, FaShieldAlt } from "react-icons/fa";
import { lazy, Suspense, useState, useEffect } from 'react';

const TypedText = lazy(() => import('../components/TypedText'));
const CyberNetwork = lazy(() => import('../components/CyberNetwork'));

const LoadingFallback = () => <div className="animate-pulse bg-white/10 w-full h-full"></div>;

export default function Home() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);

  if (!isVisible) return null;

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-purple-900 via-indigo-900 to-black text-white overflow-hidden">
      <Suspense fallback={<LoadingFallback />}>
        <CyberNetwork />
      </Suspense>

      {/* Hero Section */}
      <div className="text-center max-w-4xl px-6 animate-fadeIn">
        <h1 className="text-6xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-indigo-400 drop-shadow-lg mb-4">
          <Suspense fallback="Welcome to CyberSuite">
            <TypedText
              strings={['Welcome to CyberSuite']} 
              typeSpeed={50}
              showCursor={true}
              cursorChar="_"
            />
          </Suspense>
        </h1>
        <h2 className="text-2xl font-bold text-cyan-400 mb-4">
          <Suspense fallback="Your all-in-one security toolkit!">
            <TypedText
              strings={['Your all-in-one security toolkit!']} 
              typeSpeed={40}
              startDelay={2000}
              showCursor={true}
              cursorChar="_"
            />
          </Suspense>
        </h2>
        <p className="mt-4 text-lg text-gray-300 opacity-0 animate-fadeIn" style={{ animationDelay: '4s', animationFillMode: 'forwards' }}>
          Password Analyzer, Vulnerability Scanner, Email Breach Checker, and more.
        </p>

        {/* Call to Action Buttons */}
        <div className="mt-8 flex flex-wrap justify-center gap-4">
          <Link
            to="/password-analyzer"
            className="px-6 py-3 bg-white text-indigo-800 rounded-lg font-semibold shadow-lg hover:scale-105 transition"
          >
            Try Password Analyzer
          </Link>
          <Link
            to="/vulnerability-scan"
            className="px-6 py-3 bg-gradient-to-r from-purple-500 to-indigo-500 text-white rounded-lg font-semibold shadow-lg hover:scale-105 transition"
          >
            Run Vulnerability Scan
          </Link>
          <Link
            to="/breach-checker"
            className="px-6 py-3 border border-white/30 text-white rounded-lg hover:bg-white/5 transition"
          >
            Check Email Breaches
          </Link>
        </div>
      </div>

      {/* Features Section */}
      <div className="mt-16 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl px-6">
        {[
          { icon: <FaLock size={40} />, title: "Password Analyzer", desc: "Check your password strength and resistance against cracking attempts." },
          { icon: <FaBug size={40} />, title: "Vulnerability Scan", desc: "Scan websites for known vulnerabilities and misconfigurations." },
          { icon: <FaDatabase size={40} />, title: "CVE Lookup", desc: "Search for Common Vulnerabilities and Exposures with detailed reports." },
          { icon: <FaEnvelope size={40} />, title: "Breach Checker", desc: "Find if your email or data has been part of a security breach." },
          { icon: <FaShieldAlt size={40} />, title: "Network Checks", desc: "Run security checks for your network setup and configurations." },
          { icon: <FaShieldAlt size={40} />, title: "PDF Reports", desc: "Generate PDF reports for audits, compliance, and documentation." }
        ].map((feature, index) => (
          <div
            key={index}
            className="p-6 bg-white/10 rounded-lg shadow-lg backdrop-blur-sm hover:scale-105 transition flex flex-col items-center text-center"
          >
            <div className="text-purple-300 mb-4">{feature.icon}</div>
            <h3 className="text-xl font-bold mb-2">{feature.title}</h3>
            <p className="text-gray-300">{feature.desc}</p>
          </div>
        ))}
      </div>

      {/* Footer */}
      <footer className="mt-16 text-gray-400 text-sm pb-6">
        © {new Date().getFullYear()} CyberSuite — Secure your digital life.
      </footer>
    </div>
  );
}


