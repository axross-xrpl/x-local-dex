import React from "react";

interface HeaderProps {
  title: string;
  icon?: React.ReactNode;
  className?: string;
}

export const Header: React.FC<HeaderProps> = ({ title, icon, className }) => {
  return (
    <header id="header" className={`flex items-center gap-3 ${className || ''}`}>
      {icon && (
        <div className="flex-shrink-0">
          {icon}
        </div>
      )}
      <h1 className="text-2xl font-bold">{title}</h1>
    </header>
  );
};