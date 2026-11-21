"use client";

import { useState } from "react";
import { CheckCircle2, RotateCcw, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { QuizContent } from "@/lib/types";

export function Quiz({ content }: { content: QuizContent }) {
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<(number | null)[]>(() =>
    content.questions.map(() => null),
  );

  const total = content.questions.length;
  const finished = index >= total;
  const correct = answers.filter(
    (answer, i) => answer === content.questions[i]?.correctIndex,
  ).length;

  function restart() {
    setAnswers(content.questions.map(() => null));
    setIndex(0);
  }

  if (finished) {
    return (
      <div className="mx-auto max-w-xl space-y-4 rounded-3xl border p-8 text-center">
        <p className="font-heading text-2xl font-semibold">
          {correct} / {total}
        </p>
        <p className="text-muted-foreground">
          {correct === total
            ? "Perfect score!"
            : correct >= total / 2
              ? "Nice work. Review the ones you missed."
              : "Keep studying and try again."}
        </p>
        <Button onClick={restart}>
          <RotateCcw />
          Retake quiz
        </Button>
      </div>
    );
  }

  const question = content.questions[index];
  const answer = answers[index];
  const answered = answer !== null;

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div className="flex items-center justify-between text-sm">
        <span>
          Question {index + 1} of {total}
        </span>
        <span className="text-muted-foreground">{correct} correct</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary transition-all"
          style={{ width: `${((index + 1) / total) * 100}%` }}
        />
      </div>

      <h2 className="font-heading text-lg font-semibold">{question.question}</h2>

      <div className="space-y-2">
        {question.options.map((option, optionIndex) => {
          const isCorrect = optionIndex === question.correctIndex;
          const isChosen = optionIndex === answer;
          return (
            <button
              key={optionIndex}
              type="button"
              disabled={answered}
              onClick={() =>
                setAnswers((current) =>
                  current.map((value, i) => (i === index ? optionIndex : value)),
                )
              }
              className={cn(
                "flex w-full items-center gap-3 rounded-2xl border p-3 text-left text-sm transition-colors",
                !answered && "hover:bg-muted/50",
                answered && isCorrect && "border-primary bg-primary/10",
                answered && isChosen && !isCorrect && "border-destructive bg-destructive/10",
              )}
            >
              <span className="grid size-6 shrink-0 place-items-center rounded-full border text-xs font-semibold">
                {String.fromCharCode(65 + optionIndex)}
              </span>
              <span className="flex-1">{option}</span>
              {answered && isCorrect && <CheckCircle2 className="size-4 text-primary" />}
              {answered && isChosen && !isCorrect && (
                <XCircle className="size-4 text-destructive" />
              )}
            </button>
          );
        })}
      </div>

      {answered && (
        <div className="space-y-3 rounded-2xl bg-muted/50 p-4 text-sm">
          <p className="font-semibold">
            {answer === question.correctIndex ? "Correct!" : "Not quite."}
          </p>
          <p className="text-muted-foreground">{question.explanation}</p>
          <Button size="sm" onClick={() => setIndex((value) => value + 1)}>
            {index === total - 1 ? "See results" : "Next question"}
          </Button>
        </div>
      )}
    </div>
  );
}
