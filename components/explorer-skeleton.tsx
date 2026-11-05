import { ColumnHeadings } from "@/components/column-headings";

const ROWS = Array.from({ length: 14 }, (_, index) => index);

export function ExplorerSkeleton() {
  return (
    <div aria-busy="true" aria-label="Chargement des publications">
      <div className="border-b border-line">
        <div className="page grid gap-2 py-2.5 sm:grid-cols-2 lg:grid-cols-[minmax(0,20rem)_minmax(0,15rem)_auto_minmax(max-content,1fr)]">
          <div className="field" />
          <div className="field" />
          <div className="field sm:col-span-2 lg:col-span-1 lg:w-[20.5rem]" />
        </div>
        <ColumnHeadings />
      </div>
      <div className="animate-pulse">
        {ROWS.map((row) => (
          <div key={row} className="border-b border-line/70">
            <div className="page py-3">
              <div className="h-3.5 rounded-sm bg-line/60" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
