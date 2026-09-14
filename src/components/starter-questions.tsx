import { ArrowUpRight } from "lucide-react";

const starterQuestions = [
  "What is AskLucidly?",
  "Tell me about the latest AI models",
  "How does serverless edge computing work?",
  "What are the benefits of vector databases?",
];

export const StarterQuestionsList = ({
  handleSend,
}: {
  handleSend: (question: string) => void;
}) => {
  return (
    <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-4 w-full">
      {starterQuestions.map((question) => (
        <li key={question}>
          <button
            onClick={() => handleSend(question)}
            className="group w-full flex items-center gap-3 rounded-xl border border-border/50 bg-card/40 px-4 py-3 text-left transition-all duration-200 hover:border-tint/40 hover:bg-card/70 hover:shadow-[0_4px_20px_-6px_hsl(var(--tint)/0.2)]"
          >
            <span className="shrink-0 flex items-center justify-center rounded-lg bg-tint/10 text-tint transition-colors duration-200 group-hover:bg-tint/20 p-1.5">
              <ArrowUpRight size={14} />
            </span>
            <span className="font-medium text-foreground/80 group-hover:text-foreground transition-colors duration-200 break-words normal-case">
              {question}
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
};
