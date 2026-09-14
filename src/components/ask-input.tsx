import TextareaAutosize from "react-textarea-autosize";
import { useState } from "react";
import { Button } from "./ui/button";
import { ArrowUp } from "lucide-react";

import { ModelSelection } from "./model-selection";
import { ModeSelection } from "./mode-selection";

const InputBar = ({
  input,
  setInput,
}: {
  input: string;
  setInput: (input: string) => void;
}) => {
  return (
    <div className="w-full flex flex-col rounded-2xl focus:outline-none px-3 py-2 bg-card/80 backdrop-blur border border-border/60 shadow-lg shadow-black/5 transition-all duration-200 focus-within:border-tint/50 focus-within:shadow-[0_0_0_1px_hsl(var(--tint)/0.25),0_8px_32px_-8px_hsl(var(--tint)/0.15)]">
      <div className="w-full">
        <TextareaAutosize
          className="w-full bg-transparent text-md resize-none focus:outline-none p-1 placeholder:text-muted-foreground/60"
          placeholder="Ask anything..."
          onChange={(e) => setInput(e.target.value)}
          value={input}
        />
      </div>
      <div className="flex flex-wrap justify-between items-center gap-2">
        <div className="flex items-center gap-2 flex-wrap min-w-0">
          <ModeSelection />
          <ModelSelection />
        </div>
        <div className="flex items-center shrink-0 ml-auto">
          <Button
            type="submit"
            variant="default"
            size="icon"
            className="rounded-full bg-tint text-tint-foreground aspect-square h-8 w-8 disabled:opacity-20 hover:bg-tint/90 hover:shadow-[0_0_16px_hsl(var(--tint)/0.4)] active:scale-95 transition-all overflow-hidden shrink-0"
            disabled={input.trim().length < 2}
          >
            <ArrowUp size={18} />
          </Button>
        </div>
      </div>
    </div>
  );
};

const FollowingUpInput = ({
  input,
  setInput,
}: {
  input: string;
  setInput: (input: string) => void;
}) => {
  return (
    <div className="w-full flex flex-row rounded-full focus:outline-none px-3 py-1 bg-card/80 backdrop-blur border border-border/60 shadow-lg shadow-black/5 items-center transition-all duration-200 focus-within:border-tint/50 focus-within:shadow-[0_0_0_1px_hsl(var(--tint)/0.25),0_8px_32px_-8px_hsl(var(--tint)/0.15)]">
      <div className="w-full min-w-0">
        <TextareaAutosize
          className="w-full bg-transparent text-md resize-none focus:outline-none p-2 placeholder:text-muted-foreground/60"
          placeholder="Ask a follow-up..."
          onChange={(e) => setInput(e.target.value)}
          value={input}
        />
      </div>
      <div className="flex items-center gap-2 pl-2 shrink-0">
        <div className="hidden md:block">
          <ModeSelection />
        </div>
        <Button
          type="submit"
          variant="default"
          size="icon"
          className="rounded-full bg-tint text-tint-foreground aspect-square h-8 w-8 disabled:opacity-20 hover:bg-tint/90 hover:shadow-[0_0_16px_hsl(var(--tint)/0.4)] active:scale-95 transition-all overflow-hidden shrink-0"
          disabled={input.trim().length < 2}
        >
          <ArrowUp size={18} />
        </Button>
      </div>
    </div>
  );
};

export const AskInput = ({
  sendMessage,
  isFollowingUp = false,
}: {
  sendMessage: (message: string) => boolean | Promise<boolean>;
  isFollowingUp?: boolean;
}) => {
  const [input, setInput] = useState("");

  // Only clear the box when the message actually went through — if the guest
  // gate blocks the send, the user's text must survive.
  const submit = async () => {
    if (input.trim().length < 2) return;
    const sent = await sendMessage(input);
    if (sent) setInput("");
  };

  return (
    <>
      <form
        className="w-full overflow-hidden"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            submit();
          }
        }}
      >
        {isFollowingUp ? (
          <FollowingUpInput input={input} setInput={setInput} />
        ) : (
          <InputBar input={input} setInput={setInput} />
        )}
      </form>
    </>
  );
};
