import { useEffect, useState } from 'react';
import { Search, X } from 'lucide-react';
import styles from './SearchInput.module.css';

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  debounceMs?: number;
}

export function SearchInput({ value, onChange, placeholder = 'Search...', debounceMs = 300 }: SearchInputProps) {
  const [local, setLocal] = useState(value);

  useEffect(() => {
    setLocal(value);
  }, [value]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (local !== value) onChange(local);
    }, debounceMs);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [local, debounceMs]);

  return (
    <div className={styles.wrapper}>
      <Search size={16} className={styles.icon} />
      <input
        className={styles.input}
        value={local}
        onChange={(e) => setLocal(e.target.value)}
        placeholder={placeholder}
      />
      {local && (
        <button
          type="button"
          className={styles.clear}
          onClick={() => {
            setLocal('');
            onChange('');
          }}
          aria-label="Clear search"
        >
          <X size={14} />
        </button>
      )}
    </div>
  );
}
