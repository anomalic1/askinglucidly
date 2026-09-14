"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { ChatPanel } from "@/components/chat-panel";

export default function ChatPage() {
  const searchParams = useSearchParams();
  const threadParam = searchParams.get("t");
  const parsed = parseInt(threadParam ?? "", 10);
  const threadId = Number.isFinite(parsed) ? parsed : undefined;

  return (
    <div className="h-screen">
      <div className="flex grow h-full mx-auto max-w-screen-md px-4 md:px-8">
        <Suspense>
          <ChatPanel threadId={threadId} />
        </Suspense>
      </div>
    </div>
  );
}
