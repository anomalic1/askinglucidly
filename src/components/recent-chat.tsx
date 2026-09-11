import { HourglassIcon, TrashIcon } from "lucide-react";
import { useHistoryStore } from "@/stores";
import { ChatModel, ChatSnapshot } from "../../generated";
import moment from "moment";
import Link from "next/link";
import { modelMap } from "./model-selection";

export default function RecentChat({
  id,
  title,
  date,
  preview,
  model_name,
}: ChatSnapshot) {
  const deleteThread = useHistoryStore((state) => state.deleteThread);
  const formattedDate = moment(date).fromNow();
  const model =
    model_name in modelMap ? modelMap[model_name as ChatModel] : null;

  return (
    <Link
      href={`/search?id=${id}`}
      className="flex-1 rounded-md flex-col cursor-pointer transition-colors group bg-background no-underline"
    >
      <div className="p-2 flex flex-col justify-between h-full space-y-3">
        <div className="flex flex-col">
          <h1 className="line-clamp-1 text-foreground font-medium group-hover:text-tint group-hover:font-semibold">
            {title}
          </h1>
          <p className="text-foreground/60 line-clamp-2">{preview}</p>
        </div>
        <div className="flex justify-between">
          <div className="flex items-center space-x-1 text-foreground/70">
            <HourglassIcon className="w-3 h-3" />
            <p className="text-xs">{formattedDate}</p>
          </div>

          <div className="flex items-center space-x-2 text-foreground/70">
            {model?.logoUrl && (
              <img
                src={model.logoUrl}
                alt={model.name}
                className="w-3 h-3 rounded-sm object-contain"
              />
            )}
            <p className="font-semibold text-xs">{model?.name}</p>
            <button
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); deleteThread(id); }}
              className="ml-2 p-1 text-foreground/50 hover:text-red-500 transition-colors"
              title="Delete Chat"
            >
              <TrashIcon className="w-3 h-3" />
            </button>
          </div>

        </div>
      </div>
    </Link>
  );
}
