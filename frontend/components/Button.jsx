import React from 'react';

const variantClasses = {
  primary: 'bg-primary text-white hover:bg-primary/90',
  accent: 'bg-accent text-white hover:bg-accent/90',
};

const Button = ({ variant = 'primary', className = '', children, ...props }) => {
  const color = variantClasses[variant] || variantClasses.primary;
  return (
    <button
      {...props}
      className={`rounded-2xl shadow-lg active:scale-95 transition-transform px-4 py-2 font-medium ${color} ${className}`}
    >
      {children}
    </button>
  );
};

export default Button;
