import React from 'react';

const Card = ({ className = '', children, ...props }) => (
  <div
    {...props}
    className={`rounded-lg shadow bg-white/90 backdrop-blur p-4 ${className}`}
  >
    {children}
  </div>
);

export default Card;
