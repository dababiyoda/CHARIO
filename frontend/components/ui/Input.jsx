import React from 'react';

const Input = ({ className = '', ...props }) => (
  <input
    {...props}
    className={`h-12 rounded-full shadow-inner px-4 focus:ring-primary focus:outline-none ${className}`}
  />
);

export default Input;
