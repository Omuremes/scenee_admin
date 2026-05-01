import { forwardRef } from 'react';
import type { SelectHTMLAttributes } from 'react';
import styles from './Select.module.css';

export interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: SelectOption[];
  placeholder?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, options, placeholder, className, ...props }, ref) => {
    return (
      <div className={`${styles.container} ${className || ''}`.trim()}>
        {label && <label className={styles.label}>{label}</label>}
        <select ref={ref} className={styles.select} {...props}>
          {placeholder && <option value="">{placeholder}</option>}
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
    );
  },
);

Select.displayName = 'Select';
