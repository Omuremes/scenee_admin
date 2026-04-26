import { ReactNode } from "react";

export function StatusView({
  title,
  detail,
  action,
}: {
  title: string;
  detail?: string;
  action?: ReactNode;
}) {
  return (
    <div className="status-view">
      <h3>{title}</h3>
      {detail ? <p>{detail}</p> : null}
      {action ? <div className="status-view__action">{action}</div> : null}
    </div>
  );
}
