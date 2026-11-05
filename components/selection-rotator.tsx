"use client";

import { useState, type ReactNode } from "react";
import { BriefCollapse } from "@/components/brief-collapse";

export type Slide = {
  id: string;
  label: string;
  title: string;
  excerpt: string;
  article: ReactNode;
};

// Un titre et deux lignes de brève se lisent en 12 secondes environ.
const SLIDE_SECONDS = 12;

// La fin de l'animation de la barre fait défiler : le CSS seul gère la pause au
// survol ou au focus, et l'arrêt si l'utilisateur préfère moins d'animations.
export function SelectionRotator({ slides }: { slides: Slide[] }) {
  const [current, setCurrent] = useState(0);
  const [rotating, setRotating] = useState(slides.length > 1);
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="rotator">
      <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
        <h2 id="selection" className="text-xs font-semibold">
          À la une
        </h2>
        {slides.map(({ id, label }, index) => {
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
                    rotating
                      ? { animationDuration: `${SLIDE_SECONDS}s` }
                      : undefined
                  }
                  onAnimationEnd={() =>
                    setCurrent((index + 1) % slides.length)
                  }
                />
              )}
            </button>
          );
        })}
        {expanded && (
          <button
            type="button"
            onClick={() => setExpanded(false)}
            className="ml-auto cursor-pointer text-xs text-muted underline underline-offset-2 hover:text-foreground"
          >
            Réduire
          </button>
        )}
      </div>
      {/* Empilées dans la même cellule : la plus haute fixe la hauteur, la liste
          en dessous ne saute pas à chaque défilement. */}
      <div className="mt-1.5 grid">
        {slides.map(({ article, excerpt, id, title }, index) => (
          <div
            key={id}
            className={`min-w-0 [grid-area:1/1] ${
              index === current ? "rotator-slide" : "invisible"
            }`}
          >
            {expanded ? (
              <BriefCollapse onCollapse={() => setExpanded(false)}>
                {article}
              </BriefCollapse>
            ) : (
              <button
                type="button"
                aria-expanded={false}
                onClick={() => {
                  setExpanded(true);
                  setRotating(false);
                }}
                className="group/slide block w-full max-w-3xl cursor-pointer text-left"
              >
                <span className="block truncate text-sm font-medium group-hover/slide:underline">
                  {title}
                </span>
                <span className="mt-0.5 line-clamp-2 text-[13px] leading-relaxed text-muted">
                  {excerpt}
                </span>
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
