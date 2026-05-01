import { ChevronLeft, ChevronRight } from 'lucide-react';
import styles from './Pagination.module.css';

interface PaginationProps {
  total: number;
  offset: number;
  limit: number;
  onChange: (offset: number) => void;
}

export function Pagination({ total, offset, limit, onChange }: PaginationProps) {
  if (total <= 0) return null;

  const start = total === 0 ? 0 : offset + 1;
  const end = Math.min(offset + limit, total);
  const hasPrev = offset > 0;
  const hasNext = offset + limit < total;

  return (
    <div className={styles.container}>
      <div className={styles.range}>
        {start}–{end} of {total}
      </div>
      <div className={styles.buttons}>
        <button
          type="button"
          className={styles.btn}
          disabled={!hasPrev}
          onClick={() => onChange(Math.max(0, offset - limit))}
          aria-label="Previous page"
        >
          <ChevronLeft size={16} />
        </button>
        <button
          type="button"
          className={styles.btn}
          disabled={!hasNext}
          onClick={() => onChange(offset + limit)}
          aria-label="Next page"
        >
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}
