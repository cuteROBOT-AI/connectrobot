import {
  NetworkingDnaResponseSchema,
  ScenarioContextSchema,
  type ConversationMessage,
  type NetworkingDnaResponse,
  type RecommendationBoard,
  type ScenarioContext,
} from "./schemas.js";
import type { FinalReasoner } from "./final-reasoner.js";
import type { ScenarioInterpreter } from "./scenario-interpreter.js";
import type { SessionRepository } from "./session-repository.js";

export interface NetworkingDnaPipeline {
  repository: SessionRepository;
  scenarioInterpreter: ScenarioInterpreter;
  finalReasoner: FinalReasoner;
  recentMessageLimit: number;
}

export type NetworkingDnaMessageTimingStage =
  | "session_history_retrieval"
  | "scenario_interpreter"
  | "scenario_upsert"
  | "preview_referral_candidates"
  | "final_reasoner"
  | "session_message_persistence";

export interface NetworkingDnaMessageTimingOptions {
  now?: () => number;
  onTiming?: (stage: NetworkingDnaMessageTimingStage, elapsedMs: number) => void;
}

export async function createNetworkingDnaSession(
  repository: SessionRepository,
  initialSummary?: string,
): Promise<{ session_id: string }> {
  return { session_id: await repository.createSession(initialSummary) };
}

export async function processNetworkingDnaMessage(
  sessionId: string,
  message: string,
  pipeline: NetworkingDnaPipeline,
  timing: NetworkingDnaMessageTimingOptions = {},
): Promise<NetworkingDnaResponse> {
  const { session, recentMessages } = await measurePipelineStage(
    timing,
    "session_history_retrieval",
    async () => {
      const session = await pipeline.repository.getSession(sessionId);
      const recentMessages = await pipeline.repository.listRecentMessages(
        sessionId,
        pipeline.recentMessageLimit,
      );
      return { session, recentMessages };
    },
  );

  await measurePipelineStage(timing, "session_message_persistence", () =>
    pipeline.repository.saveMessage(session.id, "user", message),
  );

  const conversation: ConversationMessage[] = [
    ...recentMessages,
    { role: "user", content: message },
  ];

  const structuredContext = await measurePipelineStage(
    timing,
    "scenario_interpreter",
    () =>
      pipeline.scenarioInterpreter.interpret({
        previousContext: parsePreviousContext(session.current_structured_context),
        messages: conversation,
      }),
  );

  await measurePipelineStage(timing, "scenario_upsert", () =>
    pipeline.repository.upsertCurrentScenario(session.id, structuredContext),
  );

  const candidates = await measurePipelineStage(timing, "preview_referral_candidates", () =>
    pipeline.repository.previewCandidates(structuredContext, 3),
  );
  const recommendationBoard = await measurePipelineStage(timing, "final_reasoner", () =>
    pipeline.finalReasoner.buildBoard({
      context: structuredContext,
      candidates,
    }),
  );
  const assistantMessage = buildAssistantMessage(recommendationBoard);

  await measurePipelineStage(timing, "session_message_persistence", async () => {
    await pipeline.repository.updateSessionState(
      session.id,
      structuredContext,
      recommendationBoard,
    );
    await pipeline.repository.saveMessage(session.id, "assistant", assistantMessage);
  });

  return NetworkingDnaResponseSchema.parse({
    session_id: session.id,
    assistant_message: assistantMessage,
    structured_context: structuredContext,
    recommendation_board: recommendationBoard,
    open_questions: recommendationBoard.open_questions,
  });
}

async function measurePipelineStage<T>(
  timing: NetworkingDnaMessageTimingOptions,
  stage: NetworkingDnaMessageTimingStage,
  operation: () => Promise<T>,
): Promise<T> {
  const startedAt = getNow(timing);
  try {
    return await operation();
  } finally {
    timing.onTiming?.(stage, getNow(timing) - startedAt);
  }
}

function getNow(timing: NetworkingDnaMessageTimingOptions): number {
  return timing.now?.() ?? performance.now();
}

function parsePreviousContext(value: unknown): ScenarioContext | null {
  const parsed = ScenarioContextSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}

export function buildAssistantMessage(board: RecommendationBoard): string {
  const recommendations = board.category_groups.flatMap((group) => group.recommendations);
  const recommended = recommendations.filter(
    (recommendation) => recommendation.display_tier === "recommended",
  );
  const supporting = recommendations.filter(
    (recommendation) => recommendation.display_tier === "also_consider",
  );

  if (recommendations.length === 0) {
    return "I do not have a strong BXN referral plan yet. Share a little more about what kind of help would be most useful, and I will keep narrowing it down.";
  }

  if (recommended.length > 0) {
    const memberText = formatMemberHighlights(recommended.slice(0, 2));

    if (recommended.length === 1 && supporting.length === 0) {
      return `I found one useful BXN member to consider: ${memberText}.`;
    }

    if (recommended.length === 1) {
      return `I found one strong place to start: ${memberText}. I also see a few supporting options on the board.`;
    }

    return `There are a few useful BXN members to consider. I would start with ${memberText}.`;
  }

  const memberText = formatMemberHighlights(supporting.slice(0, 2));
  const countText =
    supporting.length === 1 ? "one supporting BXN option" : "a few supporting BXN options";

  return `I found ${countText} to consider${memberText ? `, including ${memberText}` : ""}. These may be useful, but I would treat them as secondary until the situation is clearer.`;
}

function formatMemberHighlights(
  recommendations: RecommendationBoard["category_groups"][number]["recommendations"],
): string {
  return recommendations.map(formatMemberHighlight).join(" and ");
}

function formatMemberHighlight(
  recommendation: RecommendationBoard["category_groups"][number]["recommendations"][number],
): string {
  return `${recommendation.full_name} for ${formatNeedLabel(recommendation.need_label)}`;
}

function formatNeedLabel(needLabel: string): string {
  if (/^[A-Z0-9\s&/-]+$/.test(needLabel)) return needLabel;
  return needLabel
    .split(" ")
    .map((word) => (/^[A-Z0-9&/-]{2,}$/.test(word) ? word : word.toLowerCase()))
    .join(" ");
}
