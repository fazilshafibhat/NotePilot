"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { Brain, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ModeToggle } from "@/components/ui/mode-toggle";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Spinner } from "@/components/ui/spinner";
import { notifySuccess } from "@/components/app/common";
import { signOut, useSession } from "@/lib/auth-client";

/**
 * Signs out, clears every cached query (so the next user never sees this
 * user's notebooks), and returns to the sign-in page.
 */
export function useSignOut() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [pending, setPending] = useState(false);

  async function handleSignOut() {
    setPending(true);
    try {
      await signOut();
    } catch {
      // Still leave the app locally even if the request failed.
    } finally {
      queryClient.clear();
      router.replace("/");
      notifySuccess("Signed out", "See you next time.");
    }
  }

  return { signOut: handleSignOut, pending };
}

/** Asks for confirmation before signing out. */
function SignOutDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { signOut: handleSignOut, pending } = useSignOut();

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Sign out of NotePilot?</AlertDialogTitle>
          <AlertDialogDescription>
            You&apos;ll need to sign in with Google again to get back to your
            notebooks. Your notebooks, sources, and chats stay saved.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
          <Button onClick={handleSignOut} disabled={pending}>
            {pending ? <Spinner /> : <LogOut />}
            Sign out
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function initialsOf(user: { name?: string | null; email: string }) {
  return (user.name || user.email)
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function UserMenu() {
  const { data: session } = useSession();
  const [confirming, setConfirming] = useState(false);
  const user = session?.user;

  if (!user) return null;

  const initials = initialsOf(user);

  return (
    <>
    <SignOutDialog open={confirming} onOpenChange={setConfirming} />
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant="ghost" size="icon" className="rounded-full" />
        }
      >
        {user.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={user.image}
            alt=""
            className="size-8 rounded-full object-cover"
            referrerPolicy="no-referrer"
          />
        ) : (
          <span className="grid size-8 place-items-center rounded-full bg-muted text-xs font-semibold">
            {initials}
          </span>
        )}
        <span className="sr-only">Account</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-56">
        {/* Base UI requires a menu label to live inside a group. */}
        <DropdownMenuGroup>
          <DropdownMenuLabel className="font-normal">
            <div className="text-sm font-medium text-foreground">
              {user.name}
            </div>
            <div className="truncate text-xs text-muted-foreground">
              {user.email}
            </div>
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => setConfirming(true)}>
          <LogOut />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
    </>
  );
}

/** Account row with a visible Sign out button, for the bottom of sidebars. */
export function AccountFooter() {
  const { data: session } = useSession();
  const [confirming, setConfirming] = useState(false);
  const user = session?.user;
  if (!user) return null;

  return (
    <div className="flex items-center gap-2 border-t p-3">
      <SignOutDialog open={confirming} onOpenChange={setConfirming} />
      {user.image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={user.image}
          alt=""
          className="size-8 shrink-0 rounded-full object-cover"
          referrerPolicy="no-referrer"
        />
      ) : (
        <span className="grid size-8 shrink-0 place-items-center rounded-full bg-muted text-xs font-semibold">
          {initialsOf(user)}
        </span>
      )}
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium">{user.name}</div>
        <div className="truncate text-xs text-muted-foreground">
          {user.email}
        </div>
      </div>
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={() => setConfirming(true)}
        title="Sign out"
      >
        <LogOut />
        <span className="sr-only">Sign out</span>
      </Button>
    </div>
  );
}

/** Right side of the dashboard header: Memory link, theme toggle, account. */
export function HeaderActions() {
  return (
    <div className="flex items-center gap-1">
      <Button nativeButton={false} variant="ghost" size="sm" render={<Link href="/memory" />}>
        <Brain />
        Memory
      </Button>
      <ModeToggle />
      <UserMenu />
    </div>
  );
}
