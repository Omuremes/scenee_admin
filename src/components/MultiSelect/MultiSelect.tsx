import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown, X } from 'lucide-react';
import styles from './MultiSelect.module.css';

export interface MultiSelectOption {
  value: string;
  label: string;
}

interface MultiSelectProps {
  label?: string;
  value: string[];
  options: MultiSelectOption[];
  onChange: (next: string[]) => void;
  placeholder?: string;
  loading?: boolean;
  emptyMessage?: string;
}

export function MultiSelect({
  label,
  value,
  options,
  onChange,
  placeholder = 'Select...',
  loading = false,
  emptyMessage = 'Nothing found',
}: MultiSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const valueSet = useMemo(() => new Set(value), [value]);
  const selected = useMemo(
    () => options.filter((option) => valueSet.has(option.value)),
    [options, valueSet],
  );

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return options;
    return options.filter((option) => option.label.toLowerCase().includes(term));
  }, [options, query]);

  const toggle = (val: string) => {
    if (valueSet.has(val)) {
      onChange(value.filter((v) => v !== val));
    } else {
      onChange([...value, val]);
    }
  };

  const removeOne = (event: React.MouseEvent, val: string) => {
    event.stopPropagation();
    onChange(value.filter((v) => v !== val));
  };

  return (
    <div className={styles.container} ref={wrapperRef}>
      {label && <label className={styles.label}>{label}</label>}
      <div
        className={`${styles.control} ${open ? styles.open : ''}`}
        onClick={() => setOpen((v) => !v)}
        role="button"
        tabIndex={0}
      >
        <div className={styles.values}>
          {selected.length === 0 && <span className={styles.placeholder}>{placeholder}</span>}
          {selected.map((option) => (
            <span key={option.value} className={styles.chip}>
              {option.label}
              <button
                type="button"
                className={styles.chipRemove}
                onClick={(e) => removeOne(e, option.value)}
                aria-label={`Remove ${option.label}`}
              >
                <X size={12} />
              </button>
            </span>
          ))}
        </div>
        <ChevronDown size={16} className={styles.chevron} />
      </div>
      {open && (
        <div className={styles.dropdown}>
          <input
            className={styles.search}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search..."
            autoFocus
          />
          <div className={styles.list}>
            {loading && <div className={styles.empty}>Loading...</div>}
            {!loading && filtered.length === 0 && <div className={styles.empty}>{emptyMessage}</div>}
            {!loading && filtered.map((option) => {
              const isSelected = valueSet.has(option.value);
              return (
                <button
                  type="button"
                  key={option.value}
                  className={`${styles.option} ${isSelected ? styles.optionSelected : ''}`}
                  onClick={() => toggle(option.value)}
                >
                  <span className={styles.checkbox}>{isSelected && <Check size={14} />}</span>
                  <span>{option.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
