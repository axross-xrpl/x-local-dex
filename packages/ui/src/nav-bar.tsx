import { ReactNode } from 'react';

export interface NavItem {
  path: string;
  label: string;
  icon?: ReactNode;
}

export interface NavBarProps {
  brand?: ReactNode;
  items: NavItem[];
  currentPath: string;
  onNavigate: (path: string) => void;
  className?: string;
}

export const NavBar = ({ 
  brand, 
  items, 
  currentPath, 
  onNavigate, 
  className = "" 
}: NavBarProps) => {
  return (
    <nav className={`bg-white shadow-lg ${className}`}>
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex justify-between items-center py-4">
          {brand && (
            <div className="flex-shrink-0">
              {brand}
            </div>
          )}
          
          <div className="flex space-x-6">
            {items.map((item) => (
              <button
                key={item.path}
                onClick={() => onNavigate(item.path)}
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${
                  currentPath === item.path
                    ? "bg-blue-500 text-white"
                    : "text-gray-700 hover:text-blue-500 hover:bg-gray-100"
                }`}
              >
                {item.icon && (
                  <span className="w-4 h-4">
                    {item.icon}
                  </span>
                )}
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </nav>
  );
};