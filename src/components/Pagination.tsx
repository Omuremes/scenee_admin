export function Pagination({
  offset,
  limit,
  total,
  onChange,
}: {
  offset: number;
  limit: number;
  total: number;
  onChange: (nextOffset: number) => void;
}) {
  const previousDisabled = offset <= 0;
  const nextDisabled = offset + limit >= total;

  return (
    <div className="pagination">
      <button type="button" className="button button--ghost" disabled={previousDisabled} onClick={() => onChange(Math.max(offset - limit, 0))}>
        Previous
      </button>
      <span>
        {Math.min(offset + 1, total)}-{Math.min(offset + limit, total)} of {total}
      </span>
      <button type="button" className="button button--ghost" disabled={nextDisabled} onClick={() => onChange(offset + limit)}>
        Next
      </button>
    </div>
  );
}
