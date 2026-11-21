"use client";

import { useCallback, useEffect, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Shuffle,
  Sparkles,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/ui/kbd";
import { cn } from "@/lib/utils";
import type { FlashcardsContent } from "@/lib/types";

export function Flashcards({ content }: { content: FlashcardsContent }) {
  const [order, setOrder] = useState(() => content.cards.map((_, i) => i));
  const [position, setPosition] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [learned, setLearned] = useState<Set<number>>(new Set());

  const total = order.length;
  const cardIndex = order[position];
  const card = content.cards[cardIndex];

  const go = useCallback(
    (delta: number) => {
      setFlipped(false);
      setPosition((current) => Math.min(total - 1, Math.max(0, current + delta)));
    },
    [total],
  );

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.target instanceof HTMLElement && event.target.closest("input, textarea")) {
        return;
      }
      if (event.key === "ArrowRight") go(1);
      else if (event.key === "ArrowLeft") go(-1);
      else if (event.key === " ") {
        event.preventDefault();
        setFlipped((value) => !value);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go]);

  function shuffle() {
    setOrder((current) => [...current].sort(() => Math.random() - 0.5));
    setPosition(0);
    setFlipped(false);
  }

  function restart() {
    setOrder(content.cards.map((_, i) => i));
    setPosition(0);
    setFlipped(false);
    setLearned(new Set());
  }

  function toggleLearned() {
    setLearned((current) => {
      const next = new Set(current);
      if (next.has(cardIndex)) next.delete(cardIndex);
      else next.add(cardIndex);
      return next;
    });
  }

  if (!card) return null;

  return (
    <div className="mx-auto max-w-xl space-y-4">
      <div className="flex items-center justify-between text-sm">
        <span>
          Card {position + 1} of {total}
        </span>
        <span className="flex items-center gap-1 text-muted-foreground">
          <Sparkles className="size-4" />
          {learned.size} learned
        </span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary transition-all"
          style={{ width: `${((position + 1) / total) * 100}%` }}
        />
      </div>

      <button
        type="button"
        onClick={() => setFlipped((value) => !value)}
        className="block w-full [perspective:1200px]"
        aria-label={flipped ? "Show front" : "Show back"}
      >
        <div
          className={cn(
            "relative h-64 w-full transition-transform duration-500 [transform-style:preserve-3d]",
            flipped && "[transform:rotateY(180deg)]",
          )}
        >
          <CardFace label="Front" text={card.front} />
          <CardFace label="Back" text={card.back} back />
        </div>
      </button>

      <div className="flex items-center justify-between">
        <Button variant="outline" size="sm" onClick={() => go(-1)} disabled={position === 0}>
          <ChevronLeft />
          Previous
        </Button>
        <div className="flex gap-1">
          <Button variant="ghost" size="sm" onClick={() => setFlipped((v) => !v)}>
            <RotateCcw />
            Flip
          </Button>
          <Button
            variant={learned.has(cardIndex) ? "default" : "ghost"}
            size="sm"
            onClick={toggleLearned}
          >
            <Check />
            Learned
          </Button>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => go(1)}
          disabled={position === total - 1}
        >
          Next
          <ChevronRight />
        </Button>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <Kbd>←</Kbd>
          <Kbd>→</Kbd>
          to navigate
          <Kbd>Space</Kbd>
          to flip
        </span>
        <div className="flex gap-1">
          <Button variant="ghost" size="xs" onClick={shuffle}>
            <Shuffle />
            Shuffle
          </Button>
          <Button variant="ghost" size="xs" onClick={restart}>
            <RotateCcw />
            Restart
          </Button>
        </div>
      </div>
    </div>
  );
}

function CardFace({
  label,
  text,
  back,
}: {
  label: string;
  text: string;
  back?: boolean;
}) {
  return (
    <div
      className={cn(
        "absolute inset-0 flex flex-col rounded-3xl border bg-card p-5 text-left [backface-visibility:hidden]",
        back && "[transform:rotateY(180deg)] border-primary/40",
      )}
    >
      <span className="text-xs tracking-wider text-muted-foreground uppercase">
        {label}
      </span>
      <div className="grid flex-1 place-items-center overflow-y-auto text-center">
        <p className={cn("text-base", !back && "font-semibold")}>{text}</p>
      </div>
    </div>
  );
}
