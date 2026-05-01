import { forwardRef } from 'react';
import type { InputHTMLAttributes } from 'react';
import styles from './TextField.module.css';

interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
}

export const TextField = forwardRef<HTMLInputElement, TextFieldProps>(
  ({ label, error, className, ...props }, ref) => {
    return (
      <div className={`${styles.container} ${className || ''}`.trim()}>
        <label className={styles.label}>{label}</label>
        <input 
          ref={ref}
          className={`${styles.input} ${error ? styles.hasError : ''}`} 
          {...props} 
        />
        {error && <span className={styles.error}>{error}</span>}
      </div>
    );
  }
);

TextField.displayName = 'TextField';

