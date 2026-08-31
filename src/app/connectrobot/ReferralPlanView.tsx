import { useEffect, useMemo, useState } from "react";
import { ExternalLink, Mail, Phone } from "lucide-react";

import { fetchReferralPlanSnapshot } from "./api";
import {
  buildPresentedCategoryGroups,
  getProfileHref,
  type PresentedRecommendation,
} from "./presentation";
import {
  sanitizeBoardHeadline,
  sanitizeCategorySummary,
  sanitizeRecommendationText,
} from "./format-board";
import type { ReferralPlanSnapshotResponse } from "./types";

interface ReferralPlanViewProps {
  token: string;
}

export function ReferralPlanView({ token }: ReferralPlanViewProps) {
  const [plan, setPlan] = useState<ReferralPlanSnapshotResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    fetchReferralPlanSnapshot(token)
      .then((response) => {
        if (!cancelled) setPlan(response);
      })
      .catch((caught) => {
        if (!cancelled) {
          setError(
            caught instanceof Error
              ? caught.message
              : "This referral plan could not be loaded.",
          );
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [token]);

  const groups = useMemo(
    () => buildPresentedCategoryGroups(plan?.snapshot.recommendation_board ?? null),
    [plan],
  );

  if (isLoading) {
    return (
      <main className="min-h-screen bg-[#f4f2ec] px-5 py-10 text-[#171b18]">
        <div className="mx-auto max-w-4xl rounded-md border border-[#ded9cf] bg-white p-6">
          Loading referral plan...
        </div>
      </main>
    );
  }

  if (error || !plan) {
    return (
      <main className="min-h-screen bg-[#f4f2ec] px-5 py-10 text-[#171b18]">
        <div className="mx-auto max-w-4xl rounded-md border border-[#edd3d0] bg-white p-6 text-[#8b312a]">
          {error ?? "This referral plan could not be loaded."}
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f4f2ec] px-5 py-8 text-[#171b18]">
      <div className="mx-auto max-w-5xl">
        <header className="border-b border-[#d8ddd6] pb-5">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#68716b]">
            BXN ConnectROBOT Referral Plan
          </p>
          <h1 className="mt-1 text-2xl font-semibold text-[#19201c]">
            {sanitizeBoardHeadline(
              plan.snapshot.headline,
              plan.snapshot.recommendation_board.total_recommendations,
            )}
          </h1>
          {plan.snapshot.scenario_summary ? (
            <p className="mt-3 max-w-3xl text-sm leading-6 text-[#59625b]">
              {plan.snapshot.scenario_summary}
            </p>
          ) : null}
        </header>

        <div className="mt-6 space-y-6">
          {groups.map((group) => (
            <section key={group.category_key} className="space-y-2">
              <div>
                <h2 className="text-base font-semibold text-[#202820]">
                  {group.category_label}
                </h2>
                {sanitizeCategorySummary(group.category_summary) ? (
                  <p className="text-sm leading-5 text-[#69736c]">
                    {sanitizeCategorySummary(group.category_summary)}
                  </p>
                ) : null}
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                {group.recommendations.map((recommendation) => (
                  <PublicRecommendationCard
                    key={recommendation.member_id}
                    recommendation={recommendation}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </main>
  );
}

function PublicRecommendationCard({
  recommendation,
}: {
  recommendation: PresentedRecommendation;
}) {
  const profileHref = getProfileHref(recommendation);
  const reason = sanitizeRecommendationText(recommendation.reason);

  return (
    <article className="rounded-md border border-[#d8ddd6] bg-white p-4 shadow-sm">
      {profileHref ? (
        <a
          href={profileHref}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 text-sm font-semibold text-[#17201b] hover:text-[#1f6f61] hover:underline"
        >
          {recommendation.full_name}
          <ExternalLink className="size-3" />
        </a>
      ) : (
        <h3 className="text-sm font-semibold text-[#17201b]">
          {recommendation.full_name}
        </h3>
      )}
      {recommendation.business_name ? (
        <p className="mt-1 text-xs font-medium text-[#5d665f]">
          {recommendation.business_name}
        </p>
      ) : null}
      <div className="mt-2 flex flex-wrap gap-1.5">
        {recommendation.need_labels.map((needLabel) => (
          <span
            key={needLabel}
            className="rounded-md border border-[#e1d7bc] bg-[#fbf7eb] px-2 py-0.5 text-[11px] font-semibold text-[#7a6841]"
          >
            {needLabel}
          </span>
        ))}
      </div>
      {reason ? (
        <p className="mt-3 text-sm leading-5 text-[#354038]">
          {reason}
        </p>
      ) : null}
      <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-xs text-[#68716b]">
        {recommendation.phone ? (
          <a
            href={`tel:${recommendation.phone}`}
            className="inline-flex items-center gap-1 hover:text-[#1f6f61]"
          >
            <Phone className="size-3" />
            {recommendation.phone}
          </a>
        ) : null}
        {recommendation.email ? (
          <a
            href={`mailto:${recommendation.email}`}
            className="inline-flex items-center gap-1 hover:text-[#1f6f61]"
          >
            <Mail className="size-3" />
            {recommendation.email}
          </a>
        ) : null}
      </div>
    </article>
  );
}
