"use client";
import * as React from "react";

import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useConfigStore } from "@/stores";
import { ChatModel } from "../../generated";

type Model = {
  name: string;
  description: string;
  value: string;
  logoUrl: string;
};

const LOGO_TOKEN = "live_6a1a28fd-6420-4492-aeb0-b297461d9de2";

export const modelMap: Record<ChatModel, Model> = {
  [ChatModel.SONAR_FREE]: {
    name: "Sonar",
    description: "Web search powered",
    value: ChatModel.SONAR_FREE,
    logoUrl: `https://img.logo.dev/perplexity.ai?token=${LOGO_TOKEN}&size=128&retina=true&format=png`,
  },
  [ChatModel.NEMOTRON_3_SUPER]: {
    name: "Nemotron Super",
    description: "Fast 120B model",
    value: ChatModel.NEMOTRON_3_SUPER,
    logoUrl: `https://img.logo.dev/nvidia.com?token=${LOGO_TOKEN}&size=128&retina=true&format=png`,
  },
  [ChatModel.NEMOTRON_3_ULTRA]: {
    name: "Nemotron Ultra",
    description: "550B reasoning",
    value: ChatModel.NEMOTRON_3_ULTRA,
    logoUrl: `https://img.logo.dev/nvidia.com?token=${LOGO_TOKEN}&size=128&retina=true&format=png`,
  },
  [ChatModel.LING_3_0_FLASH_SANTE]: {
    name: "Ling Sante",
    description: "Ling 3.0 Flash",
    value: ChatModel.LING_3_0_FLASH_SANTE,
    logoUrl: `https://img.logo.dev/nvidia.com?token=${LOGO_TOKEN}&size=128&retina=true&format=png`,
  },
  [ChatModel.DOTS_3_NOTE_PREVIEW]: {
    name: "Dots Note Preview",
    description: "Dots 3 Note",
    value: ChatModel.DOTS_3_NOTE_PREVIEW,
    logoUrl: `https://img.logo.dev/nvidia.com?token=${LOGO_TOKEN}&size=128&retina=true&format=png`,
  },
  [ChatModel.NEMOTRON_3_5_LIGHTNING]: {
    name: "Nemotron Lightning",
    description: "Lightning fast model",
    value: ChatModel.NEMOTRON_3_5_LIGHTNING,
    logoUrl: `https://img.logo.dev/nvidia.com?token=${LOGO_TOKEN}&size=128&retina=true&format=png`,
  },
  [ChatModel.LING_3_0_FLASH_FIN]: {
    name: "Ling Fin",
    description: "Ling 3.0 Flash Fin",
    value: ChatModel.LING_3_0_FLASH_FIN,
    logoUrl: `https://img.logo.dev/nvidia.com?token=${LOGO_TOKEN}&size=128&retina=true&format=png`,
  },
};

const ModelItem: React.FC<{ model: Model }> = ({ model }) => (
  <SelectItem
    key={model.value}
    value={model.value}
    className="flex flex-col items-start p-2.5 cursor-pointer"
  >
    <div className="flex items-center space-x-3">
      <img
        src={model.logoUrl}
        alt={model.name}
        className="w-5 h-5 rounded-sm object-contain"
      />
      <div className="flex flex-col">
        <span className="font-semibold text-sm">{model.name}</span>
        <span className="text-xs text-muted-foreground">{model.description}</span>
      </div>
    </div>
  </SelectItem>
);

export function ModelSelection() {
  const { model, setModel } = useConfigStore();
  const selectedModel = modelMap[model] ?? modelMap[ChatModel.SONAR_FREE];

  return (
    <Select
      defaultValue={model}
      value={model}
      onValueChange={(value) => {
        if (value) {
          setModel(value as ChatModel);
        }
      }}
    >
      <SelectTrigger className="w-fit space-x-2 bg-transparent outline-none border-none select-none focus:ring-0 shadow-none transition-all duration-200 ease-in-out hover:opacity-80 text-sm">
        <SelectValue>
          <div className="flex items-center space-x-2">
            <img
              src={selectedModel.logoUrl}
              alt={selectedModel.name}
              className="w-4 h-4 rounded-sm object-contain"
            />
            <span className="font-medium">{selectedModel.name}</span>
          </div>
        </SelectValue>
      </SelectTrigger>
      <SelectContent className="w-[240px]">
        <SelectGroup>
          {Object.values(modelMap).map((m) => (
            <ModelItem key={m.value} model={m} />
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}
