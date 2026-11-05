"use client";

import type { ReactNode } from "react";

// Un clic sur le texte réduit la brève, un glisser le sélectionne sans réduire.
// Sans onCollapse, c'est le <details> parent qui se referme.
export function BriefCollapse({
  children,
  onCollapse,
}: {
  children: ReactNode;
  onCollapse?: () => void;
}) {
  return (
    <div
      className="[&_p]:cursor-pointer"
      onClick={({ currentTarget, target }) => {
        if (
          !(target as Element).closest("p") ||
          !window.getSelection()?.isCollapsed
        ) {
          return;
        }
        if (onCollapse) onCollapse();
        else currentTarget.closest("details")?.removeAttribute("open");
      }}
    >
      {children}
    </div>
  );
}
