"use client";

export default function Error({ retry }: { error: unknown; retry: () => void }) {
  return (
    <div className="page py-20 text-center">
      <p className="text-sm font-medium">
        Impossible de charger les publications.
      </p>
      <button
        type="button"
        className="mt-2 text-[13px] text-muted underline underline-offset-2 hover:text-foreground"
        onClick={() => retry()}
      >
        Réessayer
      </button>
    </div>
  );
}
