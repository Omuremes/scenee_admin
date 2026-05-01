import { forwardRef } from 'react';
import type { TextareaHTMLAttributes } from 'react';
import styles from './TextArea.module.css';

interface TextAreaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export const TextArea = forwardRef<HTMLTextAreaElement, TextAreaProps>(
  ({ label, error, className, ...props }, ref) => {
    return (
      <div className={`${styles.container} ${className || ''}`.trim()}>
        {label && <label className={styles.label}>{label}</label>}
        <textarea
          ref={ref}
          className={`${styles.textarea} ${error ? styles.hasError : ''}`}
          {...props}
        />
        {error && <span className={styles.error}>{error}</span>}
      </div>
    );
  },
);

TextArea.displayName = 'TextArea';
