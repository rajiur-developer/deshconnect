"use client";

import { useEffect, useId, useRef, useState, type ReactNode, type KeyboardEvent } from "react";

export type AnimatedTab = { id: string; label: string; content: ReactNode };

export function AnimatedTabs({ tabs, label = "Sections" }: { tabs: AnimatedTab[]; label?: string }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [contentIndex, setContentIndex] = useState(0);
  const [phase, setPhase] = useState<"enter" | "exit">("enter");
  const switchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const instanceId = useId().replace(/:/g, "");

  useEffect(() => () => {
    if (switchTimer.current) clearTimeout(switchTimer.current);
  }, []);

  function selectTab(index: number) {
    if (index === activeIndex || !tabs[index]) return;
    if (switchTimer.current) clearTimeout(switchTimer.current);
    setActiveIndex(index);
    setPhase("exit");
    switchTimer.current = setTimeout(() => {
      setContentIndex(index);
      setPhase("enter");
    }, 140);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key !== "ArrowRight" && event.key !== "ArrowLeft" && event.key !== "Home" && event.key !== "End") return;
    event.preventDefault();
    const nextIndex = event.key === "Home"
      ? 0
      : event.key === "End"
        ? tabs.length - 1
        : (activeIndex + (event.key === "ArrowRight" ? 1 : tabs.length - 1)) % tabs.length;
    selectTab(nextIndex);
    document.getElementById(`${instanceId}-tab-${nextIndex}`)?.focus();
  }

  if (!tabs.length) return null;
  const displayedTab = tabs[contentIndex] ?? tabs[0];

  return (
    <div>
      <div role="tablist" aria-label={label} className="flex gap-1 border-b border-slate-200">
        {tabs.map((tab, index) => (
          <button
            key={tab.id}
            id={`${instanceId}-tab-${index}`}
            type="button"
            role="tab"
            aria-selected={activeIndex === index}
            aria-controls={`${instanceId}-panel`}
            tabIndex={activeIndex === index ? 0 : -1}
            className="tab-trigger rounded-t-lg px-4 py-2 text-sm font-medium text-slate-600"
            onClick={() => selectTab(index)}
            onKeyDown={handleKeyDown}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <section
        key={displayedTab.id}
        id={`${instanceId}-panel`}
        role="tabpanel"
        aria-labelledby={`${instanceId}-tab-${contentIndex}`}
        aria-busy={phase === "exit"}
        className={`py-4 ${phase === "exit" ? "tab-panel-exit" : "tab-panel-enter"}`}
        tabIndex={0}
      >
        {displayedTab.content}
      </section>
    </div>
  );
}
