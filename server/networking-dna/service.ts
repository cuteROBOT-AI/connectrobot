import type { NetworkingDnaEnv } from "./env.js";
import { createNetworkingDnaOpenAIClient } from "./openai.js";
import { OpenAIFinalReasoner } from "./final-reasoner.js";
import { OpenAIScenarioInterpreter } from "./scenario-interpreter.js";
import { createNetworkingDnaSupabaseClient } from "./supabase.js";
import { SupabaseSessionRepository } from "./session-repository.js";
import type { NetworkingDnaPipeline } from "./pipeline.js";

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
