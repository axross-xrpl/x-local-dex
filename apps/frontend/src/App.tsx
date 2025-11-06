import { Routes, Route, Link, useLocation } from "react-router-dom";
import { Header } from "@repo/ui";
import HomePage from "../pages/HomePage";
import Wallet from "../pages/Wallet";

const App = () => {
  const location = useLocation();
  const title = import.meta.env.VITE_TITLE || "Frontend App";

  const navItems = [
    { path: "/", label: "Home" },
    // Add more navigation items here as needed
    { path: "/wallet", label: "Wallet" },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex justify-between items-center py-4">
            <Header title= {title} />
            <div className="flex space-x-6">
              {navItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    location.pathname === item.path
                      ? "bg-blue-500 text-white"
                      : "text-gray-700 hover:text-blue-500 hover:bg-gray-100"
                  }`}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </nav>
      
      <main className="max-w-7xl mx-auto px-4 py-8">
        <Routes>
          <Route path="/" element={<HomePage />} />
          {/* // Add more routes here as needed */}
          <Route path="/wallet" element={<Wallet />} />
        </Routes>
      </main>
    </div>
  );
};

export default App;