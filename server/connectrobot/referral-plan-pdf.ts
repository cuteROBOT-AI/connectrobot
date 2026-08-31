import {
  PDFDocument,
  PDFName,
  PDFString,
  StandardFonts,
  rgb,
  type PDFFont,
  type PDFPage,
} from "pdf-lib";

import type { ReferralPlanSnapshotPayload } from "./referral-plan-schemas.js";

const PAGE_WIDTH = 612;
const PAGE_HEIGHT = 792;
const MARGIN = 54;
const LINE_HEIGHT = 14;

export async function renderReferralPlanPdf(
  snapshot: ReferralPlanSnapshotPayload,
): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);

  let page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  let y = PAGE_HEIGHT - MARGIN;

  function ensureSpace(height: number) {
    if (y - height >= MARGIN) return;
    page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    y = PAGE_HEIGHT - MARGIN;
  }

  function drawText(
    text: string,
    options: {
      size?: number;
      weight?: "regular" | "bold";
      color?: ReturnType<typeof rgb>;
      indent?: number;
      linkUrl?: string;
    } = {},
  ) {
    const size = options.size ?? 10;
    const font = options.weight === "bold" ? bold : regular;
    const maxWidth = PAGE_WIDTH - MARGIN * 2 - (options.indent ?? 0);
    const lines = wrapText(text, font, size, maxWidth);
    ensureSpace(lines.length * LINE_HEIGHT);
    for (const line of lines) {
      const x = MARGIN + (options.indent ?? 0);
      page.drawText(line, {
        x,
        y,
        size,
        font,
        color: options.color ?? rgb(0.13, 0.16, 0.14),
      });
      if (options.linkUrl) {
        addLinkAnnotation({
          pdf,
          page,
          url: options.linkUrl,
          x,
          y,
          width: Math.min(font.widthOfTextAtSize(line, size), maxWidth),
          height: size + 2,
        });
      }
      y -= LINE_HEIGHT;
    }
  }

  drawText("BXN ConnectROBOT", {
    size: 11,
    weight: "bold",
    color: rgb(0.12, 0.44, 0.38),
  });
  y -= 10;
  drawText(
    sanitizeBoardHeadline(
      snapshot.headline,
      snapshot.recommendation_board.total_recommendations,
    ),
    { size: 18, weight: "bold" },
  );
  y -= 6;
  if (snapshot.scenario_summary) {
    drawText(snapshot.scenario_summary, { size: 10, color: rgb(0.36, 0.4, 0.36) });
    y -= 12;
  }

  for (const group of snapshot.recommendation_board.category_groups) {
    if (group.recommendations.length === 0) continue;
    ensureSpace(48);
    drawText(group.category_label, {
      size: 13,
      weight: "bold",
      color: rgb(0.12, 0.44, 0.38),
    });
    const categorySummary = sanitizeDisplayText(group.category_summary);
    if (categorySummary) {
      drawText(categorySummary, { size: 9, color: rgb(0.42, 0.45, 0.42) });
    }
    y -= 4;

    for (const recommendation of group.recommendations) {
      ensureSpace(84);
      drawText(recommendation.full_name, { size: 11, weight: "bold", indent: 10 });
      if (recommendation.business_name) {
        drawText(recommendation.business_name, {
          size: 9,
          color: rgb(0.36, 0.4, 0.36),
          indent: 10,
        });
      }
      drawText(`Capability: ${recommendation.need_label}`, {
        size: 9,
        weight: "bold",
        color: rgb(0.48, 0.4, 0.24),
        indent: 10,
      });
      drawText(sanitizeRecommendationReason(recommendation.reason), {
        size: 9,
        indent: 10,
      });
      if (recommendation.phone) {
        drawText(`Phone: ${recommendation.phone}`, { size: 9, indent: 10 });
      }
      if (recommendation.email) {
        drawText(`Email: ${recommendation.email}`, { size: 9, indent: 10 });
      }
      if (recommendation.profile_url) {
        drawText(`Profile: ${recommendation.profile_url}`, {
          size: 9,
          color: rgb(0.12, 0.36, 0.66),
          indent: 10,
          linkUrl: recommendation.profile_url,
        });
      }
      y -= 8;
    }
  }

  const bytes = await pdf.save();
  return bytes;
}

function addLinkAnnotation({
  pdf,
  page,
  url,
  x,
  y,
  width,
  height,
}: {
  pdf: PDFDocument;
  page: PDFPage;
  url: string;
  x: number;
  y: number;
  width: number;
  height: number;
}) {
  const annotations = page.node.Annots() ?? pdf.context.obj([]);
  const annotation = pdf.context.register(
    pdf.context.obj({
      Type: "Annot",
      Subtype: "Link",
      Rect: [x, y - 2, x + width, y + height],
      Border: [0, 0, 0],
      A: {
        Type: "Action",
        S: "URI",
        URI: PDFString.of(url),
      },
    }),
  );

  annotations.push(annotation);
  page.node.set(PDFName.of("Annots"), annotations);
}

function wrapText(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = "";

  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (font.widthOfTextAtSize(candidate, size) <= maxWidth) {
      line = candidate;
      continue;
    }

    if (line) lines.push(line);
    line = word;
  }

  if (line) lines.push(line);
  return lines.length > 0 ? lines : [""];
}

function sanitizeBoardHeadline(headline: string, totalRecommendations: number): string {
  const sanitized = sanitizeDisplayText(headline);
  if (sanitized) return sanitized;
  return totalRecommendations > 0 ? "BXN referrals to consider" : "No strong BXN matches yet";
}

function sanitizeRecommendationReason(reason: string): string {
  const sanitized = sanitizeDisplayText(reason);
  return sanitized || "This BXN member's services appear relevant to this need.";
}

function sanitizeDisplayText(value: string | null | undefined): string {
  if (!value || INTERNAL_RECOMMENDATION_TERMINOLOGY_PATTERN.test(value)) return "";
  return value.trim();
}

const INTERNAL_RECOMMENDATION_TERMINOLOGY_PATTERN =
  /\b(?:grounded\s+(?:bxn\s+)?(?:referral\s+)?candidates?|scorer|total[_\s-]*score|need[_\s-]*fit[_\s-]*score|context[_\s-]*fit[_\s-]*score|service[_\s-]*area[_\s-]*score|referral[_\s-]*network[_\s-]*score|inference[_\s-]*confidence|inferred[_\s-]*need|match[_\s-]*basis|match[_\s-]*type|display[_\s-]*tier|(?:scorer|internal|candidate|candidates|recommendation|recommendations|referral|member|members|need|needs|match|matches|score)\s+ranking|ranking\s+(?:logic|mechanics|algorithm|signal|signals|score|scores)|(?:exact|direct|adjacent)\s+match)\b/i;
