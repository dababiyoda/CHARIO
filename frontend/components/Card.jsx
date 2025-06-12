import React from 'react';

const Card = ({ className = '', children, ...props }) => (
  <div {...props} className={`rounded-2xl shadow-lg p-4 ${className}`}>
    {children}
  </div>
);

export default Card;
