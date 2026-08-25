'use client';
import { useState, useEffect } from 'react';
import { Moon, Sun } from 'lucide-react';

export default function ThemeToggle() {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('driver-theme');
    if (saved === 'dark') {
      setIsDark(true);
      document.documentElement.classList.add('driver-dark');
    }
  }, []);

  const toggleTheme = () => {
    setIsDark(prev => {
      const next = !prev;
      if (next) {
        document.documentElement.classList.add('driver-dark');
        localStorage.setItem('driver-theme', 'dark');
      } else {
        document.documentElement.classList.remove('driver-dark');
        localStorage.setItem('driver-theme', 'light');
      }
      return next;
    });
  };

  return (
    <button 
      onClick={toggleTheme}
      style={{
        background: 'var(--n-100)',
        border: '1px solid var(--n-200)',
        borderRadius: '20px',
        padding: '0.4rem 0.75rem',
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        cursor: 'pointer',
        color: 'var(--n-600)',
        fontSize: '0.75rem',
        fontWeight: 600
      }}
    >
      {isDark ? <Sun size={14} /> : <Moon size={14} />}
      {isDark ? 'Light Mode' : 'Night Mode'}
    </button>
  );
}
