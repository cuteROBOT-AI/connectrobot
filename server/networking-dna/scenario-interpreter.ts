import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";

import {
  CANONICAL_REFERRAL_NEED_KEYS,
  ScenarioContextSchema,
  createEmptyScenarioContext,
  type ConversationMessage,
  type ScenarioContext,
} from "./schemas.js";

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
      reasoning: { effort: "minimal" },
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
        verbosity: "low",
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
  `For inferred_needs[].need, output only one of these canonical referral_need_taxonomy keys: ${CANONICAL_REFERRAL_NEED_KEYS.join(", ")}.`,
  "Never emit prose, display labels, plural phrases, or unsupported need keys in inferred_needs[].need.",
  "Prefer needs that can actually map to the current BXN recommendation taxonomy.",
  "Do not generate broad speculative needs simply because they are plausible for someone in that life situation.",
  "Infer a need only when observed facts or explicit user statements create a grounded, high-value referral opportunity.",
  "Keep uncertainty in confidence, reason, and supported_by, but do not convert possibilities into confirmed claims.",
  "For example, two teenagers may support driver_education as an inferred need, but do not claim they need lessons.",
  "For a home that needs work, infer only taxonomy-backed home/property needs that the stated facts reasonably support; do not claim a specific system is broken unless the user stated it.",
  "For a growing business, infer taxonomy-backed business or financial needs without inventing financial, tax, IT, cybersecurity, or automation problems.",
  "Do not infer ai_automation from generic business growth alone.",
  "Do infer ai_automation when observed facts describe concrete automation-addressable operational symptoms, even if the user does not say AI or automation.",
  "Strong ai_automation signals include missed or unanswered inbound calls, lost leads because calls cannot be answered, owner or staff unable to answer while serving customers, owner or staff working in the field, after-hours call coverage gaps, call overflow, repetitive lead intake or qualification, slow or inconsistent lead follow-up, and front-line capacity constraints where automation directly addresses the stated symptom.",
  "For example, a plumbing owner missing calls while on jobs can support ai_automation; a business owner who only says the business is growing does not by itself support ai_automation.",
  "Use supported_by to name the specific observed facts that support each inference.",
  "Include unknowns only when the missing answer could materially change recommendations available in the current taxonomy.",
  "Choose follow-up questions for information gain against available recommendation keys, not generic intake completeness.",
  "Keep the context current across turns by merging new user information with the previous structured context.",
].join("\n");
