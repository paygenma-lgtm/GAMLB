import React from 'react';

export default function Button({ children, secondary = false, onClick, size = 'md' }) {
  const sizeClass = {
    'sm': 'button-sm',
    'md': '',
    'lg': 'button-lg'
  }[size] || '';

  return (
    <button
      className={`button ${secondary ? 'secondary' : ''} ${sizeClass}`.trim()}
      onClick={onClick}
      type="button"
    >
      {children}
    </button>
  );
}
