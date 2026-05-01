import type { ReactNode } from 'react';
import styles from './Tabs.module.css';

export interface TabItem {
  id: string;
  label: string;
}

interface TabsProps {
  tabs: TabItem[];
  active: string;
  onChange: (id: string) => void;
  children?: ReactNode;
}

export function Tabs({ tabs, active, onChange, children }: TabsProps) {
  return (
    <div className={styles.wrapper}>
      <div className={styles.tabBar} role="tablist">
        {tabs.map((tab) => (
          <button
            type="button"
            role="tab"
            key={tab.id}
            className={`${styles.tab} ${active === tab.id ? styles.active : ''}`}
            onClick={() => onChange(tab.id)}
            aria-selected={active === tab.id}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div className={styles.content}>{children}</div>
    </div>
  );
}
