"use client";

import { useState, type ReactNode } from "react";

export type Slide = {
  id: string;
  label: string;
  seconds: number;
  content: ReactNode;
};

// La fin de l'animation de la barre fait défiler : le CSS seul gère la pause au
// survol ou au focus, et l'arrêt si l'utilisateur préfère moins d'animations.
export function SelectionRotator({ slides }: { slides: Slide[] }) {
  const [current, setCurrent] = useState(0);
  const [rotating, setRotating] = useState(slides.length > 1);

  return (
    <div className="rotator">
      <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
        <h2 id="selection" className="text-xs font-semibold">
          À la une
        </h2>
        {slides.map(({ id, label, seconds }, index) => {
          const active = index === current;
          return (
            <button
              key={id}
              type="button"
              aria-current={active ? "true" : undefined}
              onClick={() => {
                setCurrent(index);
                setRotating(false);
              }}
              className={`relative cursor-pointer pb-1 text-xs transition-colors ${
                active ? "text-foreground" : "text-muted hover:text-foreground"
              }`}
            >
              {label}
              {active && (
                <span
                  className={`absolute inset-x-0 bottom-0 h-0.5 bg-accent ${
                    rotating ? "rotator-progress" : ""
                  }`}
                  style={
                    rotating ? { animationDuration: `${seconds}s` } : undefined
                  }
                  onAnimationEnd={() =>
                    setCurrent((index + 1) % slides.length)
                  }
                />
              )}
            </button>
          );
        })}
      </div>
      {/* Empilées dans la même cellule : la plus haute fixe la hauteur, la liste
          en dessous ne saute pas à chaque défilement. */}
      <div className="mt-1.5 grid">
        {slides.map(({ id, content }, index) => (
          <div
            key={id}
            className={`min-w-0 [grid-area:1/1] ${
              index === current ? "rotator-slide" : "invisible"
            }`}
          >
            {content}
          </div>
        ))}
      </div>
    </div>
  );
}
