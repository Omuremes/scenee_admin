import type { ButtonHTMLAttributes } from 'react';
import styles from './Button.module.css';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger';
  size?: 'sm' | 'md' | 'lg';
}

export function Button({ 
  children, 
  variant = 'primary', 
  size = 'md', 
  className,
  ...props 
}: ButtonProps) {
  const btnClass = `${styles.button} ${styles[variant]} ${styles[size]} ${className || ''}`.trim();
  
  return (
    <button className={btnClass} {...props}>
      {children}
    </button>
  );
}

