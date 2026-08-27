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
});
