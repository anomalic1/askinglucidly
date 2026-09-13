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
    <div className="w-full flex flex-col rounded-xl focus:outline-none px-3 py-2 bg-card border border-border/50">
      <div className="w-full">
        <TextareaAutosize
          className="w-full bg-transparent text-md resize-none focus:outline-none p-1"
          placeholder="Ask anything..."
          onChange={(e) => setInput(e.target.value)}
          value={input}
        />
      </div>
      <div className="flex justify-between items-center gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <ModeSelection />
          <ModelSelection />
        </div>
        <div className="flex items-center">
          <Button
            type="submit"
            variant="default"
            size="icon"
            className="rounded-full bg-white text-black aspect-square h-8 w-8 disabled:opacity-20 hover:bg-white/80 overflow-hidden"
            disabled={input.trim().length < 2}
          >
            <ArrowUp size={20} />
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
    <div className="w-full flex flex-row rounded-full focus:outline-none px-3 py-1 bg-card border border-border/50 items-center">
      <div className="w-full">
        <TextareaAutosize
          className="w-full bg-transparent text-md resize-none focus:outline-none p-2"
          placeholder="Ask a follow-up..."
          onChange={(e) => setInput(e.target.value)}
          value={input}
        />
      </div>
      <div className="flex items-center gap-2 pl-2">
        <div className="hidden md:block">
          <ModeSelection />
        </div>
        <Button
          type="submit"
          variant="default"
          size="icon"
          className="rounded-full bg-white text-black aspect-square h-8 w-8 disabled:opacity-20 hover:bg-white/80 overflow-hidden"
          disabled={input.trim().length < 2}
        >
          <ArrowUp size={20} />
        </Button>
      </div>
    </div>
  );
};

export const AskInput = ({
  sendMessage,
  isFollowingUp = false,
}: {
  sendMessage: (message: string) => void;
  isFollowingUp?: boolean;
}) => {
  const [input, setInput] = useState("");
  return (
    <>
      <form
        className="w-full overflow-hidden"
        onSubmit={(e) => {
          e.preventDefault();
          if (input.trim().length < 2) return;
          sendMessage(input);
          setInput("");
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            if (input.trim().length < 2) return;
            sendMessage(input);
            setInput("");
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
