import { Routes, Route, useNavigate, useLocation, Navigate } from "react-router-dom";
import { Header, NavBar } from "@repo/ui";
import { useAuth } from './context/AuthContext';
import logo from '/vite.svg';
import type { NavItem } from "@repo/ui";
import { ProtectedRoute } from "./components/ProtectedRoute";

// Route pages
import HomePage from "../pages/HomePage";
import Wallet from "../pages/Wallet";
import LoginPage from "../pages/LoginPage";
import CredentialCreatePage from "../pages/CredentialCreate";


// AI generated pages
import GamePage from "../pages/ai/GamePage";
import CertificatePage from "../pages/ai/CertificatePage";
import ExchangePage from "../pages/ai/ExchangePage";
import MerchantPage from "../pages/ai/MerchantPage";
import IssuePage from "../pages/ai/IssuePage";


const App = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const title = import.meta.env.VITE_TITLE || "Frontend App";
  const { address, logout } = useAuth();

  const navItems: NavItem[] = [
    { path: "/", label: "Home" },
    // // Add more navigation items here as needed
    // { path: "/wallet", label: "Wallet" },
    // { path: "/credential-create", label: "Credential Create" },
    // { path: "/game", label: "Game Page" },
    { path: "/issue-xjpy", label: "事前準備" },

  ];

  const handleNavigate = (path: string) => {
    navigate(path);
  };

  const isLoginPage = location.pathname === '/login';

  return (
    <div className="min-h-screen bg-yellow-100">
      {!isLoginPage && (
        <NavBar
          brand={
            <Header
              title={title}
              icon={
                <img src={logo} alt="Logo" className="w-10 h-10" />
              }
            />
          }
          items={navItems}
          currentPath={location.pathname}
          onNavigate={handleNavigate}
          rightContent={
            <div className="text-sm font-medium text-gray-700">
              { address ? (
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="font-mono">
                    { address }
                  </span>
                </div>
              ) : (
                <span className="text-gray-500">Not connected</span>
              )}
            </div>
          }
        />
      )}

      <main className={!isLoginPage ? "max-w-7xl mx-auto px-4 py-8" : ""}>
        <Routes>
          {/* Public Route */}
          <Route path="/login" element={<LoginPage />} />

          {/* Protected Routes */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <GamePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/certificate"
            element={
              <ProtectedRoute>
                <CertificatePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/exchange"
            element={
              <ProtectedRoute>
                <ExchangePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/merchant"
            element={
              <ProtectedRoute>
                <MerchantPage />
              </ProtectedRoute>
            }
          />

          {/* Catch all - redirect to login */}
          <Route path="*" element={<Navigate to="/login" replace />} />
          <Route path="/issue-xjpy" element={<IssuePage />} />
        </Routes>
      </main>
    </div>
  );
};

export default App;