import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";

import {
  ScenarioContextSchema,
  createEmptyScenarioContext,
  type ConversationMessage,
  type ScenarioContext,
} from "./schemas";

export interface ScenarioInterpreterInput {
  previousContext: ScenarioContext | null;
  messages: ConversationMessage[];
}

export interface ScenarioInterpreter {
  interpret(input: ScenarioInterpreterInput): Promise<ScenarioContext>;
}

export class OpenAIScenarioInterpreter implements ScenarioInterpreter {
  constructor(
    private readonly client: OpenAI,
    private readonly model: string,
  ) {}

  async interpret(input: ScenarioInterpreterInput): Promise<ScenarioContext> {
    const response = await this.client.responses.parse({
      model: this.model,
      input: [
        {
          role: "system",
          content: SCENARIO_INTERPRETER_SYSTEM_PROMPT,
        },
        {
          role: "user",
          content: JSON.stringify({
            previous_structured_context: input.previousContext ?? createEmptyScenarioContext(),
            conversation: input.messages.map((message) => ({
              role: message.role,
              content: message.content,
            })),
          }),
        },
      ],
      text: {
        format: zodTextFormat(
          ScenarioContextSchema,
          "networking_dna_scenario_context",
        ),
      },
    });

    if (!response.output_parsed) {
      throw new Error("Scenario Interpreter returned no parsed structured context");
    }

    return ScenarioContextSchema.parse(response.output_parsed);
  }
}

const SCENARIO_INTERPRETER_SYSTEM_PROMPT = [
  "You are the Scenario Interpreter for BXN Networking DNA.",
  "Transform the conversation into the exact structured context schema.",
  "Strictly separate observed facts from inferred referral opportunities.",
  "Observed fields must contain only facts the user stated or confirmed.",
  "Inferred needs may describe plausible referral opportunities, but never convert possibilities into claims.",
  "For example, two teenagers may support driver education as an inferred need, but do not claim they need lessons.",
  "For a home that needs work, infer possible home/property categories without claiming a specific system is broken.",
  "For a growing business, infer possible bookkeeping, tax, banking, IT, or automation needs without inventing financial or cybersecurity problems.",
  "Use supported_by to name the specific observed facts that support each inference.",
  "Include unknowns only when the missing answer could materially change the referral list.",
  "Keep the context current across turns by merging new user information with the previous structured context.",
].join("\n");
