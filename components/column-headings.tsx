export function ColumnHeadings() {
  return (
    <div className="hidden border-t border-line lg:block" aria-hidden="true">
      <div className="page publication-row py-1.5 font-mono text-[10px] tracking-wider text-muted uppercase">
        <span>Heure</span>
        <span>Ticker</span>
        <span>Société</span>
        <span>Publication</span>
        <span>Type</span>
        <span>Source</span>
      </div>
    </div>
  );
}
