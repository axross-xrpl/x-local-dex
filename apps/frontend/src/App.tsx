import { Routes, Route, useNavigate, useLocation } from "react-router-dom";
import { Header, NavBar } from "@repo/ui";
import type { NavItem } from "@repo/ui";
import HomePage from "../pages/HomePage";
import Wallet from "../pages/Wallet";
import CredentialCreatePage from "../pages/CredentialCreate";

// AI generated pages
import GamePage from "../pages/ai/GamePage";
import CertificatePage from "../pages/ai/CertificatePage";
import ExchangePage from "../pages/ai/ExchangePage";
import MerchantPage from "../pages/ai/MerchantPage";

const App = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const title = import.meta.env.VITE_TITLE || "Frontend App";

  const navItems: NavItem[] = [
    { path: "/", label: "Home" },
    // Add more navigation items here as needed
    { path: "/wallet", label: "Wallet" },
    { path: "/credential-create", label: "Credential Create" },
    { path: "/game", label: "Game Page" },
  ];

  const handleNavigate = (path: string) => {
    navigate(path);
  };

  return (
    <div className="min-h-screen bg-gray-50">

      <NavBar 
        brand={<Header title={title} />}
        items={navItems}
        currentPath={location.pathname}
        onNavigate={handleNavigate}
      />
      
      <main className="max-w-7xl mx-auto px-4 py-8">

        <Routes>
          <Route path="/" element={<HomePage />} />
          {/* // Add more routes here as needed */}
          <Route path="/wallet" element={<Wallet />} />
          <Route path="/credential-create" element={<CredentialCreatePage />} />
          <Route path="/game" element={<GamePage />} />

          <Route path="/certificate" element={<CertificatePage />} />
          <Route path="/exchange" element={<ExchangePage />} />
          <Route path="/merchant" element={<MerchantPage />} />
        </Routes>
      </main>
    </div>
  );
};

export default App;