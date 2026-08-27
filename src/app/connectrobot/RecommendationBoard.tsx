import { CheckCircle2, ChevronDown, Clipboard, FileDown, Mail, MessageSquareText } from "lucide-react";
import { useMemo, useState } from "react";

import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { cn } from "../components/ui/utils";
import {
  formatRecommendationBoardAsText,
  sanitizeRecommendationEvidence,
  sanitizeRecommendationText,
} from "./format-board";
import type { Recommendation, RecommendationBoardData } from "./types";

interface RecommendationBoardProps {
  board: RecommendationBoardData | null;
  isUpdating: boolean;
}

export function RecommendationBoard({ board, isUpdating }: RecommendationBoardProps) {
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">("idle");
  const boardText = useMemo(() => formatRecommendationBoardAsText(board), [board]);
  const hasRecommendations = Boolean(board && board.total_recommendations > 0);

  async function copyBoard() {
    try {
      await navigator.clipboard.writeText(boardText);
      setCopyState("copied");
      window.setTimeout(() => setCopyState("idle"), 1800);
    } catch {
      setCopyState("failed");
      window.setTimeout(() => setCopyState("idle"), 2400);
    }
  }

  return (
    <aside className="flex min-h-[620px] flex-col border-l border-[#d8ddd6] bg-[#fbfaf7] lg:min-h-0">
      <div className="flex items-center justify-between gap-3 border-b border-[#d8ddd6] px-5 py-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#67706a]">
            BXN Recommendation Board
          </p>
          <h2 className="text-lg font-semibold text-[#19201c]">
            {board?.headline ?? "Your recommendations will build here."}
          </h2>
        </div>
        {isUpdating ? (
          <div className="flex shrink-0 items-center gap-2 rounded-md border border-[#d4e2de] bg-[#edf7f4] px-3 py-1.5 text-xs font-medium text-[#276255]">
            <span className="size-2 animate-pulse rounded-full bg-[#2f8b78]" />
            Updating recommendations...
          </div>
        ) : null}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
        {!hasRecommendations ? (
          <div className="flex h-full min-h-[420px] flex-col justify-center border border-dashed border-[#cfd7d0] bg-white px-6 py-8 text-center">
            <h3 className="text-xl font-semibold text-[#202820]">
              Your recommendations will build here.
            </h3>
            <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-[#69736c]">
              Tell ConnectROBOT about a person, family, business, or situation. As it learns what they need, relevant BXN members will appear here.
            </p>
          </div>
        ) : (
          <div className="space-y-5">
            {board?.category_groups.map((group) => (
              <section key={group.category_key} className="space-y-2">
                <div className="flex items-end justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-semibold text-[#202820]">
                      {group.category_label}
                    </h3>
                    <p className="text-xs leading-5 text-[#717970]">
                      {group.category_summary}
                    </p>
                  </div>
                  <span className="text-xs font-medium text-[#8a918a]">
                    {group.recommendations.length}
                  </span>
                </div>
                <div className="space-y-2">
                  {group.recommendations.map((recommendation) => (
                    <RecommendationCard
                      key={`${recommendation.member_id}:${recommendation.need_key}`}
                      recommendation={recommendation}
                    />
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>

      <div className="border-t border-[#d8ddd6] bg-white px-5 py-3">
        <div className="grid grid-cols-4 gap-2">
          <Button variant="outline" size="sm" disabled title="Export coming soon">
            <FileDown className="size-4" />
            Export
          </Button>
          <Button variant="outline" size="sm" disabled title="Email coming soon">
            <Mail className="size-4" />
            Email
          </Button>
          <Button variant="outline" size="sm" disabled title="Text coming soon">
            <MessageSquareText className="size-4" />
            Text
          </Button>
          <Button
            variant="default"
            size="sm"
            onClick={copyBoard}
            title="Copy recommendation board"
          >
            {copyState === "copied" ? (
              <CheckCircle2 className="size-4" />
            ) : (
              <Clipboard className="size-4" />
            )}
            {copyState === "copied" ? "Copied" : "Copy"}
          </Button>
        </div>
        {copyState === "failed" ? (
          <p className="mt-2 text-xs text-[#9d322c]">
            Clipboard access was unavailable. Select and copy from the board instead.
          </p>
        ) : null}
      </div>
    </aside>
  );
}

function RecommendationCard({ recommendation }: { recommendation: Recommendation }) {
  const [expanded, setExpanded] = useState(false);
  const reason = sanitizeRecommendationText(recommendation.reason);
  const evidence = sanitizeRecommendationEvidence(recommendation.evidence);
  const serviceAreaNote = sanitizeRecommendationText(recommendation.service_area_note);
  const networkNote = sanitizeRecommendationText(recommendation.network_note);
  const hasDetails =
    evidence.length > 0 ||
    Boolean(serviceAreaNote) ||
    Boolean(networkNote);
  const isPrimary = recommendation.display_tier === "recommended";

  return (
    <article
      className={cn(
        "rounded-md border bg-white px-4 py-3 shadow-sm",
        isPrimary ? "border-[#b7d1c8]" : "border-[#dde1dc] opacity-85",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="truncate text-sm font-semibold text-[#17201b]">
              {recommendation.full_name}
            </h4>
            <Badge
              variant={isPrimary ? "default" : "secondary"}
              className={cn(
                "rounded-md text-[11px]",
                isPrimary
                  ? "bg-[#1f6f61] text-white"
                  : "bg-[#edf0ec] text-[#626b64]",
              )}
            >
              {isPrimary ? "Recommended" : "Also Consider"}
            </Badge>
          </div>
          {recommendation.business_name ? (
            <p className="mt-1 truncate text-xs font-medium text-[#5d665f]">
              {recommendation.business_name}
            </p>
          ) : null}
          <p className="mt-2 text-xs font-semibold uppercase tracking-[0.08em] text-[#84744f]">
            {recommendation.need_label}
          </p>
        </div>
      </div>

      {reason ? (
        <p className="mt-2 text-sm leading-5 text-[#354038]">{reason}</p>
      ) : null}

      {hasDetails ? (
        <div className="mt-3">
          <button
            type="button"
            onClick={() => setExpanded((value) => !value)}
            className="inline-flex items-center gap-1 text-xs font-semibold text-[#276255] hover:text-[#17483e]"
          >
            <ChevronDown
              className={cn("size-3 transition-transform", expanded ? "rotate-180" : "")}
            />
            Details
          </button>
          {expanded ? (
            <div className="mt-2 space-y-2 border-t border-[#edf0ec] pt-2 text-xs leading-5 text-[#5d665f]">
              {evidence.length > 0 ? (
                <ul className="space-y-1">
                  {evidence.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              ) : null}
              {serviceAreaNote ? (
                <p>{serviceAreaNote}</p>
              ) : null}
              {networkNote ? <p>{networkNote}</p> : null}
            </div>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}
