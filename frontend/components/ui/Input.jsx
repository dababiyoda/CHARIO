import React from 'react';

const Input = ({ className = '', ...props }) => (
  <input
    {...props}
    className={`h-12 rounded-full shadow-inner focus:ring-primary px-3 ${className}`}
  />
);

export default Input;
