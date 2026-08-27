import OpenAI from "openai";

import type { NetworkingDnaEnv } from "./env.js";

export function createNetworkingDnaOpenAIClient(env: NetworkingDnaEnv): OpenAI {
  return new OpenAI({ apiKey: env.OPENAI_API_KEY });
}
