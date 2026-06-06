import type { ChatMessage, DinerProfile, MemoryFact, MenuItem, RecommendationResponse, Restaurant } from "@/lib/types";

export type AiSource = RecommendationResponse["source"];

export type AiChatRole = "system" | "user" | "assistant";

export type AiChatMessage = {
  role: AiChatRole;
  content: string;
};

export type AiChatRequest = {
  messages: AiChatMessage[];
  model?: string;
  temperature?: number;
  maxTokens?: number;
  json?: boolean;
};

export type AiChatResult = {
  content: string;
  source: AiSource;
  model?: string;
};

export type RecommendationServiceInput = {
  restaurant: Restaurant;
  menu: MenuItem[];
  profile: DinerProfile;
  memoryFacts?: MemoryFact[];
  returning?: boolean;
};

export type GroundedChatInput = {
  restaurant: Restaurant;
  menu: MenuItem[];
  profile: DinerProfile;
  memoryFacts?: MemoryFact[];
  messages?: ChatMessage[];
  question: string;
  locale?: string;
};

export type GroundedChatResponse = {
  message: string;
  dishIds: string[];
  warnings: string[];
  source: AiSource;
};

export type ProfileExtractionInput = {
  text: string;
  previousProfile?: DinerProfile;
};

export type ProfileExtractionResponse = {
  profile: DinerProfile;
  source: AiSource;
  warnings: string[];
};
