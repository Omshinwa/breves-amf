export function ColumnHeadings() {
  return (
    <div
      className="z-10 hidden border-b border-line bg-background lg:sticky lg:top-(--filter-bar-height) lg:block"
      aria-hidden="true"
    >
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
