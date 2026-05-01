import { useCallback, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { Button } from '../Button/Button';
import { ConfirmContext } from './confirmContext';
import type { ConfirmOptions } from './confirmContext';
import styles from './ConfirmDialog.module.css';

interface ActiveDialog extends ConfirmOptions {
  resolve: (value: boolean) => void;
}

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [active, setActive] = useState<ActiveDialog | null>(null);

  const confirm = useCallback((options: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      setActive({ ...options, resolve });
    });
  }, []);

  const handleAnswer = (answer: boolean) => {
    if (active) {
      active.resolve(answer);
      setActive(null);
    }
  };

  const value = useMemo(() => ({ confirm }), [confirm]);

  return (
    <ConfirmContext.Provider value={value}>
      {children}
      {active && (
        <>
          <div className={styles.overlay} onClick={() => handleAnswer(false)} />
          <div className={styles.dialog} role="dialog" aria-modal="true">
            <h3 className={styles.title}>{active.title || 'Are you sure?'}</h3>
            <div className={styles.message}>{active.message}</div>
            <div className={styles.actions}>
              <Button type="button" variant="secondary" onClick={() => handleAnswer(false)}>
                {active.cancelLabel || 'Cancel'}
              </Button>
              <Button
                type="button"
                variant={active.variant === 'danger' ? 'danger' : 'primary'}
                onClick={() => handleAnswer(true)}
              >
                {active.confirmLabel || 'Confirm'}
              </Button>
            </div>
          </div>
        </>
      )}
    </ConfirmContext.Provider>
  );
}
