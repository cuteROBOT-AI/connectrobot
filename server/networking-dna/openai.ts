import OpenAI from "openai";

import type { NetworkingDnaEnv } from "./env";

export function createNetworkingDnaOpenAIClient(env: NetworkingDnaEnv): OpenAI {
  return new OpenAI({ apiKey: env.OPENAI_API_KEY });
}
