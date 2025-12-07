import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
}

export const Button: React.FC<ButtonProps> = ({ 
  children, 
  variant = 'primary', 
  size = 'md', 
  className = '', 
  ...props 
}) => {
  // Tech-inspired base styles
  const baseStyle = "inline-flex items-center justify-center rounded-lg font-bold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed transform active:scale-95";
  
  const variants = {
    // Primary: Uses CSS variable for color (set in App.tsx)
    primary: "bg-[var(--brand-color)] text-white shadow-lg shadow-[var(--brand-color)]/30 hover:shadow-[var(--brand-color)]/50 border border-white/20",
    secondary: "bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-[var(--brand-color)] hover:text-[var(--brand-color)] shadow-sm",
    danger: "bg-red-500/10 text-red-600 border border-red-200 hover:bg-red-500 hover:text-white shadow-sm hover:shadow-red-500/30",
    ghost: "bg-transparent hover:bg-gray-100 text-gray-600",
  };

  const sizes = {
    sm: "px-3 py-1.5 text-xs",
    md: "px-5 py-2.5 text-sm",
    lg: "px-8 py-4 text-base",
  };

  return (
    <button 
      className={`${baseStyle} ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};