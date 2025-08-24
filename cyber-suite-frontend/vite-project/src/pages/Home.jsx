
import { Link } from "react-router-dom";
import { FaLock, FaBug, FaDatabase, FaEnvelope, FaShieldAlt } from "react-icons/fa";
import { lazy, Suspense, useState, useEffect } from 'react';

const TypedText = lazy(() => import('../components/TypedText'));
const DataFlowBackground = lazy(() => import('../components/DataFlowBackground'));

const LoadingFallback = () => <div className="animate-pulse bg-white/10 w-full h-full"></div>;

export default function Home() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);

  if (!isVisible) return null;

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center text-white overflow-hidden bg-[#0F2027]">
      {/* Background */}
      <Suspense fallback={<div className="fixed inset-0 bg-gradient-to-b from-[#0F2027] to-[#2C5364]" />}>
        <DataFlowBackground />
      </Suspense>
      

      {/* Hero Section */}
      <div className="text-center max-w-4xl px-4 sm:px-6 animate-fadeIn">
        <h1 className="text-4xl sm:text-6xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-[#10ff8d] to-[#00faff] drop-shadow-lg mb-4">
          <Suspense fallback="Welcome to CyberSuite">
            <TypedText
              strings={['Welcome to CyberSuite']} 
              typeSpeed={50}
              showCursor={true}
              cursorChar="_"
            />
          </Suspense>
        </h1>
        <h2 className="text-xl sm:text-2xl font-bold text-[#00faff] mb-4">
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
        <p className="mt-4 text-base sm:text-lg text-[#10ff8d]/90 opacity-0 animate-fadeIn" style={{ animationDelay: '4s', animationFillMode: 'forwards' }}>
          Password Analyzer, Vulnerability Scanner, Email Breach Checker, and more.
        </p>

        {/* Call to Action Buttons */}
        <div className="mt-8 flex flex-col sm:flex-row flex-wrap justify-center gap-4 px-4 sm:px-0">
          <Link
            to="/password-analyzer"
            className="w-full sm:w-auto px-6 py-3 bg-[#10ff8d] text-gray-900 rounded-lg font-semibold shadow-lg hover:scale-105 transition-all duration-300 hover:bg-[#00ff99]"
          >
            Try Password Analyzer
          </Link>
          <Link
            to="/vulnerability-scan"
            className="w-full sm:w-auto px-6 py-3 bg-gradient-to-r from-[#0F2027] to-[#2C5364] text-white rounded-lg font-semibold shadow-lg hover:scale-105 transition-all duration-300 border border-[#10ff8d]/30 hover:border-[#10ff8d]/60"
          >
            Run Vulnerability Scan
          </Link>
          <Link
            to="/breach-checker"
            className="w-full sm:w-auto px-6 py-3 border border-[#10ff8d]/30 text-white rounded-lg hover:bg-[#2C5364]/30 transition-all duration-300 hover:border-[#10ff8d]/60"
          >
            Check Email Breaches
          </Link>
        </div>
      </div>

      {/* Features Section */}
      <div className="mt-16 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-8 max-w-6xl px-4 sm:px-6">
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
            className="p-4 sm:p-6 bg-[#2C5364]/30 rounded-lg shadow-lg backdrop-blur-sm hover:scale-105 hover:bg-[#2C5364]/40 transition-all duration-300 flex flex-col items-center text-center border border-white/10"
          >
            <div className="text-cyan-300 mb-4 transform transition-transform duration-300 group-hover:scale-110">{feature.icon}</div>
            <h3 className="text-xl font-bold mb-2 text-cyan-100">{feature.title}</h3>
            <p className="text-gray-300">{feature.desc}</p>
          </div>
        ))}
      </div>

      {/* Footer */}
      <footer className="mt-16 text-[#00faff]/60 text-sm pb-6">
        © {new Date().getFullYear()} CyberSuite — Secure your digital life.
      </footer>
    </div>
  );
}


