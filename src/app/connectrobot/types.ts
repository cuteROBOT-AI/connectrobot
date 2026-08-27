export interface ConversationMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
}

export interface OpenQuestion {
  question: string;
  why_it_matters: string;
  priority: "high" | "medium" | "low";
}

export interface Recommendation {
  member_id: string;
  full_name: string;
  business_name: string | null;
  phone?: string | null;
  email?: string | null;
  profile_url?: string | null;
  profile_path?: string | null;
  need_key: string;
  need_label: string;
  display_tier: "recommended" | "also_consider";
  reason: string;
  evidence: string[];
  service_area_note: string | null;
  network_note: string | null;
  score: number;
}

export interface RecommendationCategoryGroup {
  category_key: string;
  category_label: string;
  category_summary: string;
  recommendations: Recommendation[];
}

export interface RecommendationBoardData {
  session_summary: string;
  headline: string;
  total_recommendations: number;
  category_groups: RecommendationCategoryGroup[];
  open_questions: OpenQuestion[];
}

export interface NetworkingDnaResponse {
  session_id: string;
  assistant_message: string;
  structured_context: unknown;
  recommendation_board: RecommendationBoardData;
  open_questions: OpenQuestion[];
}
