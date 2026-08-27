import type { NetworkingDnaEnv } from "./env";
import { createNetworkingDnaOpenAIClient } from "./openai";
import { OpenAIFinalReasoner } from "./final-reasoner";
import { OpenAIScenarioInterpreter } from "./scenario-interpreter";
import { createNetworkingDnaSupabaseClient } from "./supabase";
import { SupabaseSessionRepository } from "./session-repository";
import type { NetworkingDnaPipeline } from "./pipeline";

export function createDefaultNetworkingDnaPipeline(env: NetworkingDnaEnv): NetworkingDnaPipeline {
  const openai = createNetworkingDnaOpenAIClient(env);
  const supabase = createNetworkingDnaSupabaseClient(env);

  return {
    repository: new SupabaseSessionRepository(supabase),
    scenarioInterpreter: new OpenAIScenarioInterpreter(openai, env.OPENAI_MODEL),
    finalReasoner: new OpenAIFinalReasoner(
      openai,
      env.OPENAI_FINAL_REASONER_MODEL ?? env.OPENAI_MODEL,
    ),
    recentMessageLimit: env.NETWORKING_DNA_RECENT_MESSAGE_LIMIT,
  };
}
