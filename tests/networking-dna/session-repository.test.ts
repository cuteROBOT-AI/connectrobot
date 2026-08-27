import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";

import { ScenarioContextSchema } from "../../server/networking-dna/schemas";
import { SupabaseSessionRepository } from "../../server/networking-dna/session-repository";
import fixture from "./fixtures/austin-family-business.json";

describe("SupabaseSessionRepository schema contracts", () => {
  const context = ScenarioContextSchema.parse(fixture.structured_context);

  it("creates networking sessions with a non-null recommendations array", async () => {
    const insert = vi.fn(() => ({
      select: vi.fn(() => ({
        single: vi.fn(async () => ({
          data: { id: "session-123" },
          error: null,
        })),
      })),
    }));
    const supabase = {
      from: vi.fn((table: string) => {
        expect(table).toBe("networking_sessions");
        return { insert };
      }),
    } as unknown as SupabaseClient;

    const repository = new SupabaseSessionRepository(supabase);
    await expect(repository.createSession("Initial summary")).resolves.toBe("session-123");

    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({
        current_summary: "Initial summary",
        current_structured_context: expect.any(Object),
        current_recommendations: [],
      }),
    );
  });

  it("inserts referral scenarios using scenario_text, not scenario_summary", async () => {
    let insertedPayload: unknown;
    const insert = vi.fn(async (payload: unknown) => {
      insertedPayload = payload;
      return { error: null };
    });
    const supabase = {
      from: vi.fn((table: string) => {
        expect(table).toBe("referral_scenarios");
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              maybeSingle: vi.fn(async () => ({ data: null, error: null })),
            })),
          })),
          insert,
        };
      }),
    } as unknown as SupabaseClient;

    const repository = new SupabaseSessionRepository(supabase);
    await repository.upsertCurrentScenario("session-123", context);

    expect(insert).toHaveBeenCalledWith({
      session_id: "session-123",
      scenario_text: context.scenario_summary,
      structured_context: context,
    });
    expect(insertedPayload).not.toHaveProperty("scenario_summary");
  });

  it("updates the current referral scenario using scenario_text", async () => {
    let updatedPayload: unknown;
    const update = vi.fn((payload: unknown) => {
      updatedPayload = payload;
      return {
        eq: vi.fn(async () => ({ error: null })),
      };
    });
    const supabase = {
      from: vi.fn((table: string) => {
        expect(table).toBe("referral_scenarios");
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              maybeSingle: vi.fn(async () => ({
                data: { id: "scenario-123" },
                error: null,
              })),
            })),
          })),
          update,
        };
      }),
    } as unknown as SupabaseClient;

    const repository = new SupabaseSessionRepository(supabase);
    await repository.upsertCurrentScenario("session-123", context);

    expect(update).toHaveBeenCalledWith({
      session_id: "session-123",
      scenario_text: context.scenario_summary,
      structured_context: context,
    });
    expect(updatedPayload).not.toHaveProperty("scenario_summary");
  });
});
