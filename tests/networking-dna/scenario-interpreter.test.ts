import type OpenAI from "openai";
import { describe, expect, it, vi } from "vitest";

import { OpenAIScenarioInterpreter } from "../../server/networking-dna/scenario-interpreter.js";
import { ScenarioContextSchema } from "../../server/networking-dna/schemas.js";
import fixture from "./fixtures/austin-family-business.json";

describe("OpenAI Scenario Interpreter", () => {
  it("requests low-latency Responses API behavior while preserving structured output", async () => {
    const context = ScenarioContextSchema.parse(fixture.structured_context);
    const parse = vi.fn(async () => ({ output_parsed: context }));
    const client = { responses: { parse } } as unknown as OpenAI;
    const interpreter = new OpenAIScenarioInterpreter(client, "current-interpreter-model");

    await interpreter.interpret({
      previousContext: null,
      messages: [{ role: "user", content: fixture.message }],
    });

    expect(parse).toHaveBeenCalledWith(
      expect.objectContaining({
        model: "current-interpreter-model",
        reasoning: { effort: "minimal" },
        text: expect.objectContaining({
          verbosity: "low",
          format: expect.any(Object),
        }),
      }),
    );
  });

  it("allows concrete missed-call symptoms to support ai_automation without requiring solution words", async () => {
    const context = ScenarioContextSchema.parse({
      ...fixture.structured_context,
      inferred_needs: [
        {
          need: "ai_automation",
          category: "business_growth",
          importance: 0.9,
          confidence: 0.82,
          reason: "The owner is missing calls while working in the field.",
          supported_by: [
            "Plumbing owner is on repair jobs",
            "Calls go unanswered",
            "The owner is afraid of losing leads",
          ],
        },
      ],
    });
    const parse = vi.fn(async () => ({ output_parsed: context }));
    const client = { responses: { parse } } as unknown as OpenAI;
    const interpreter = new OpenAIScenarioInterpreter(client, "current-interpreter-model");

    await interpreter.interpret({
      previousContext: null,
      messages: [
        {
          role: "user",
          content:
            "I own a plumbing company and sometimes I'm in the middle of a repair when the phone rings and I can't pick up. I'm afraid I'm losing leads.",
        },
      ],
    });

    const request = (parse.mock.calls as unknown[][])[0]?.[0] as {
      input: Array<{ role: string; content: string }>;
    };
    const systemPrompt = request.input.find((item) => item.role === "system")?.content;
    const userPayload = request.input.find((item) => item.role === "user")?.content;

    expect(systemPrompt).toContain("concrete automation-addressable operational symptoms");
    expect(systemPrompt).toContain("missed or unanswered inbound calls");
    expect(systemPrompt).toContain("plumbing owner missing calls while on jobs");
    expect(userPayload).toContain("plumbing company");
    expect(context.inferred_needs[0]?.need).toBe("ai_automation");
  });

  it("preserves the guardrail against inferring ai_automation from generic business growth", async () => {
    const context = ScenarioContextSchema.parse({
      ...fixture.structured_context,
      inferred_needs: [],
    });
    const parse = vi.fn(async () => ({ output_parsed: context }));
    const client = { responses: { parse } } as unknown as OpenAI;
    const interpreter = new OpenAIScenarioInterpreter(client, "current-interpreter-model");

    await interpreter.interpret({
      previousContext: null,
      messages: [{ role: "user", content: "My business is growing." }],
    });

    const request = (parse.mock.calls as unknown[][])[0]?.[0] as {
      input: Array<{ role: string; content: string }>;
    };
    const systemPrompt = request.input.find((item) => item.role === "system")?.content;

    expect(systemPrompt).toContain("Do not infer ai_automation from generic business growth alone.");
    expect(systemPrompt).toContain("a business owner who only says the business is growing");
    expect(context.inferred_needs).toEqual([]);
  });

  it("continues allowing explicit AI voice requests to map to ai_automation", async () => {
    const context = ScenarioContextSchema.parse({
      ...fixture.structured_context,
      inferred_needs: [
        {
          need: "ai_automation",
          category: "business_growth",
          importance: 0.95,
          confidence: 0.95,
          reason: "The user explicitly asked for an AI voice assistant.",
          supported_by: ["User asked for an AI voice assistant"],
        },
      ],
    });
    const parse = vi.fn(async () => ({ output_parsed: context }));
    const client = { responses: { parse } } as unknown as OpenAI;
    const interpreter = new OpenAIScenarioInterpreter(client, "current-interpreter-model");

    const result = await interpreter.interpret({
      previousContext: null,
      messages: [{ role: "user", content: "I need an AI voice assistant for my office." }],
    });

    expect(result.inferred_needs[0]?.need).toBe("ai_automation");
  });
});
