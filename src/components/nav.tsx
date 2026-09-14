"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ModeToggle } from "./mode-toggle";
import { Button } from "./ui/button";
import { HistoryIcon, LogOutIcon, PlusIcon, ArrowLeft, Github } from "lucide-react";
import { useChatStore } from "@/stores";
import { useAuth } from "@/lib/auth";

const NewChatButton = () => {
  const { setMessages, setThreadId } = useChatStore();
  return (
    <Button
      variant="secondary"
      size="sm"
      onClick={() => {
        // The live conversation is persisted now, so "New" must clear it
        // explicitly before heading home.
        setMessages([]);
        setThreadId(null);
        location.href = "/";
      }}
    >
      <PlusIcon className="w-4 h-4" />
      <span className="block">&nbsp;&nbsp;New</span>
    </Button>
  );
};

export function Navbar() {
  const { messages } = useChatStore();
  const { user, signOut } = useAuth();

  const pathname = usePathname();
  const onHomePage = pathname === "/";

  return (
    <header className="w-full flex fixed p-1 z-50 px-3 bg-background/80 backdrop-blur-md border-b border-border/40 justify-between items-center">
      <div className="flex items-center gap-2">
        {!onHomePage && (
          <Button variant="ghost" size="icon" onClick={() => history.back()} className="mr-1">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        )}
        <Link href="/" passHref onClick={() => (location.href = "/")}>
          <span className="text-lg font-bold tracking-tight text-foreground">
            AskLucidly
          </span>
        </Link>
        {!onHomePage && <NewChatButton />}
      </div>
      <div className="flex items-center gap-3">
        <a href="https://github.com/anomalic1/askinglucidly" target="_blank" rel="noopener noreferrer">
          <Button variant="ghost" size="sm" className="font-medium gap-2 text-muted-foreground hover:text-foreground">
            <Github className="w-4 h-4" />
            <span className="hidden md:inline">Open Source</span>
          </Button>
        </a>
        <Link href="/history" passHref>
          <div className="font-medium hover:underline decoration-tint underline-offset-4 transition-all duration-200 ease-in-out transform hover:scale-[1.02] text-left break-words normal-case">
            <div className="flex items-center gap-2">
              <HistoryIcon className="w-4 h-4" />
              History
            </div>
          </div>
        </Link>
        {user ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => signOut()}
            className="font-medium gap-2 text-muted-foreground hover:text-foreground"
          >
            <LogOutIcon className="w-4 h-4" />
            <span className="hidden md:inline">Sign out</span>
          </Button>
        ) : (
          <Link href="/login" passHref>
            <Button variant="outline" size="sm" className="hidden md:flex font-medium">
              Sign In
            </Button>
          </Link>
        )}
        <ModeToggle />
      </div>
    </header>
  );
}
