export interface AITool {
  id: number;
  name: string;
  company: string;
  url: string;
  category: string;
  description: string;
  keyFeatures: string[];
  pricing: {
    free: boolean;
    startingPrice: string;
    plans: string[];
  };
  bestFor: string[];
  lastUpdated: string;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  toolCards?: AITool[];
  isLoading?: boolean;
  statusText?: string;
}
