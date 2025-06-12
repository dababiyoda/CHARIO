import React from 'react';

const Button = ({ className = '', children, ...props }) => (
  <button
    {...props}
    className={`rounded-full shadow px-4 py-2 transition-transform duration-150 hover:scale-95 ${className}`}
  >
    {children}
  </button>
);

export default Button;
