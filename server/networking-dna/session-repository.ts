import type { SupabaseClient } from "@supabase/supabase-js";

import {
  CandidateScorerResultsSchema,
  ConversationMessageSchema,
  NetworkingSessionRowSchema,
  createEmptyScenarioContext,
  type CandidateScorerResult,
  type ConversationMessage,
  type NetworkingSessionRow,
  type RecommendationBoard,
  type ScenarioContext,
} from "./schemas";

export interface SessionRepository {
  createSession(initialSummary?: string): Promise<string>;
  getSession(sessionId: string): Promise<NetworkingSessionRow>;
  listRecentMessages(sessionId: string, limit: number): Promise<ConversationMessage[]>;
  saveMessage(sessionId: string, role: "user" | "assistant", content: string): Promise<void>;
  upsertCurrentScenario(sessionId: string, context: ScenarioContext): Promise<void>;
  previewCandidates(context: ScenarioContext, limitPerNeed: number): Promise<CandidateScorerResult[]>;
  updateSessionState(
    sessionId: string,
    context: ScenarioContext,
    board: RecommendationBoard,
  ): Promise<void>;
}

function assertNoSupabaseError(error: { message: string } | null, operation: string): void {
  if (error) {
    throw new Error(`${operation} failed: ${error.message}`);
  }
}

export class SupabaseSessionRepository implements SessionRepository {
  constructor(private readonly supabase: SupabaseClient) {}

  async createSession(initialSummary = ""): Promise<string> {
    const context = createEmptyScenarioContext(initialSummary);
    const { data, error } = await this.supabase
      .from("networking_sessions")
      .insert({
        current_summary: initialSummary,
        current_structured_context: context,
        current_recommendations: null,
      })
      .select("id")
      .single();

    assertNoSupabaseError(error, "Create networking session");
    const parsed = NetworkingSessionRowSchema.pick({ id: true }).parse(data);
    return parsed.id;
  }

  async getSession(sessionId: string): Promise<NetworkingSessionRow> {
    const { data, error } = await this.supabase
      .from("networking_sessions")
      .select("id,current_summary,current_structured_context,current_recommendations")
      .eq("id", sessionId)
      .single();

    assertNoSupabaseError(error, "Fetch networking session");
    return NetworkingSessionRowSchema.parse(data);
  }

  async listRecentMessages(sessionId: string, limit: number): Promise<ConversationMessage[]> {
    const { data, error } = await this.supabase
      .from("networking_session_messages")
      .select("role,content,created_at")
      .eq("session_id", sessionId)
      .order("created_at", { ascending: false })
      .limit(limit);

    assertNoSupabaseError(error, "Fetch networking session messages");
    return ConversationMessageSchema.array().parse(data ?? []).reverse();
  }

  async saveMessage(
    sessionId: string,
    role: "user" | "assistant",
    content: string,
  ): Promise<void> {
    const { error } = await this.supabase.from("networking_session_messages").insert({
      session_id: sessionId,
      role,
      content,
    });

    assertNoSupabaseError(error, `Save ${role} message`);
  }

  async upsertCurrentScenario(sessionId: string, context: ScenarioContext): Promise<void> {
    const payload = {
      session_id: sessionId,
      scenario_summary: context.scenario_summary,
      structured_context: context,
    };

    const { data: existing, error: lookupError } = await this.supabase
      .from("referral_scenarios")
      .select("id")
      .eq("session_id", sessionId)
      .maybeSingle();

    assertNoSupabaseError(lookupError, "Lookup current referral scenario");

    if (existing?.id) {
      const { error } = await this.supabase
        .from("referral_scenarios")
        .update(payload)
        .eq("id", existing.id);
      assertNoSupabaseError(error, "Update current referral scenario");
      return;
    }

    const { error } = await this.supabase.from("referral_scenarios").insert(payload);
    assertNoSupabaseError(error, "Insert current referral scenario");
  }

  async previewCandidates(
    context: ScenarioContext,
    limitPerNeed: number,
  ): Promise<CandidateScorerResult[]> {
    const { data, error } = await this.supabase.rpc("preview_referral_candidates", {
      p_context: context,
      p_limit_per_need: limitPerNeed,
    });

    assertNoSupabaseError(error, "Preview referral candidates");
    return CandidateScorerResultsSchema.parse(data ?? []);
  }

  async updateSessionState(
    sessionId: string,
    context: ScenarioContext,
    board: RecommendationBoard,
  ): Promise<void> {
    const { error } = await this.supabase
      .from("networking_sessions")
      .update({
        current_summary: context.scenario_summary,
        current_structured_context: context,
        current_recommendations: board,
      })
      .eq("id", sessionId);

    assertNoSupabaseError(error, "Update networking session state");
  }
}
