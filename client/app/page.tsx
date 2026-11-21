"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { BookOpen, MessageSquare, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { ModeToggle } from "@/components/ui/mode-toggle";
import { Logo, notifyError } from "@/components/app/common";
import { FullPageSpinner } from "@/components/app/auth-gate";
import { signIn, useSession } from "@/lib/auth-client";

const FEATURES = [
  {
    icon: BookOpen,
    title: "Upload sources",
    text: "PDFs, websites, YouTube, and notes in one place",
  },
  {
    icon: MessageSquare,
    title: "Chat with context",
    text: "Ask questions grounded in your materials",
  },
  {
    icon: Sparkles,
    title: "Learn faster",
    text: "Flashcards, quizzes, mind maps, and summaries",
  },
];

export default function Home() {
  const { data: session, isPending } = useSession();
  const router = useRouter();
  const [signingIn, setSigningIn] = useState(false);

  useEffect(() => {
    if (session) router.replace("/dashboard");
  }, [session, router]);

  async function handleSignIn() {
    setSigningIn(true);
    const { error } = await signIn.social({
      provider: "google",
      callbackURL: `${window.location.origin}/dashboard`,
    });
    if (error) {
      setSigningIn(false);
      notifyError(new Error(error.message ?? "Sign-in failed"), "Sign-in failed");
    }
  }

  if (isPending || session) return <FullPageSpinner />;

  return (
    <div className="relative flex min-h-svh flex-col overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 -top-40 h-[480px] bg-[radial-gradient(ellipse_at_top,var(--color-primary)_0%,transparent_60%)] opacity-15"
      />
      <header className="relative mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-5">
        <Logo />
        <ModeToggle />
      </header>

      <main className="relative mx-auto flex w-full max-w-5xl flex-1 flex-col justify-center gap-12 px-6 pb-20">
        <div className="max-w-2xl space-y-5">
          <p className="text-sm font-medium text-primary">
            Your AI study notebook
          </p>
          <h1 className="font-heading text-4xl font-semibold tracking-tight sm:text-5xl">
            Learn from everything you read.
          </h1>
          <p className="text-muted-foreground">
            Organize sources, chat with your materials, and generate learning
            tools — all in one workspace.
          </p>
          <Button size="lg" onClick={handleSignIn} disabled={signingIn}>
            {signingIn ? <Spinner /> : <GoogleIcon />}
            Continue with Google
          </Button>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          {FEATURES.map(({ icon: Icon, title, text }) => (
            <div
              key={title}
              className="rounded-2xl border bg-card/60 p-5 backdrop-blur"
            >
              <Icon className="mb-3 size-5 text-primary" />
              <div className="font-semibold">{title}</div>
              <p className="mt-1 text-sm text-muted-foreground">{text}</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className="size-4">
      <path
        fill="currentColor"
        d="M21.35 11.1h-9.17v2.73h6.51c-.33 3.81-3.5 5.44-6.5 5.44C8.36 19.27 5 16.25 5 12c0-4.1 3.2-7.27 7.2-7.27 3.09 0 4.9 1.97 4.9 1.97L19 4.72S16.56 2 12.1 2C6.42 2 2.03 6.8 2.03 12c0 5.05 4.13 10 10.22 10 5.35 0 9.25-3.67 9.25-9.09 0-1.15-.15-1.81-.15-1.81Z"
      />
    </svg>
  );
}
