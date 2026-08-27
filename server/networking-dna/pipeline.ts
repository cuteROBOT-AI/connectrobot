import {
  NetworkingDnaResponseSchema,
  ScenarioContextSchema,
  type ConversationMessage,
  type NetworkingDnaResponse,
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

export function buildAssistantMessage(
  board: Pick<
    NetworkingDnaResponse["recommendation_board"],
    "headline" | "total_recommendations" | "open_questions"
  >,
): string {
  const countText =
    board.total_recommendations === 1
      ? "I found 1 grounded BXN referral candidate."
      : `I found ${board.total_recommendations} grounded BXN referral candidates.`;

  if (board.open_questions.length === 0) {
    return `${board.headline} ${countText}`;
  }

  const questions = board.open_questions
    .slice(0, 3)
    .map((openQuestion) => openQuestion.question)
    .join(" ");

  return `${board.headline} ${countText} A few details could sharpen the board: ${questions}`;
}
