import { useEffect, useMemo, useRef, useState } from "react";

import { createConnectRobotSession, sendConnectRobotMessage } from "./api";
import { ConversationPane } from "./ConversationPane";
import { getChangedPresentedMemberIds } from "./presentation";
import { RecommendationBoard } from "./RecommendationBoard";
import type {
  ConversationMessage,
  OpenQuestion,
  RecommendationBoardData,
  ReferralPlanSnapshotResponse,
} from "./types";

export function ConnectRobotWorkspace() {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [board, setBoard] = useState<RecommendationBoardData | null>(null);
  const [openQuestions, setOpenQuestions] = useState<OpenQuestion[]>([]);
  const [savedSnapshot, setSavedSnapshot] =
    useState<ReferralPlanSnapshotResponse | null>(null);
  const [highlightedMemberIds, setHighlightedMemberIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const highlightTimeoutRef = useRef<number | null>(null);

  const topSuggestion = useMemo(() => openQuestions[0] ?? null, [openQuestions]);

  useEffect(() => {
    return () => {
      if (highlightTimeoutRef.current) {
        window.clearTimeout(highlightTimeoutRef.current);
      }
    };
  }, []);

  async function handleSend(content: string) {
    const userMessage: ConversationMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content,
    };

    setMessages((current) => [...current, userMessage]);
    setIsSending(true);
    setError(null);

    try {
      const activeSessionId = sessionId ?? (await createConnectRobotSession());
      if (!sessionId) setSessionId(activeSessionId);

      const response = await sendConnectRobotMessage(activeSessionId, content);
      const changedMemberIds = getChangedPresentedMemberIds(
        board,
        response.recommendation_board,
      );
      setBoard(response.recommendation_board);
      setOpenQuestions(response.open_questions);
      setSavedSnapshot(null);
      if (highlightTimeoutRef.current) {
        window.clearTimeout(highlightTimeoutRef.current);
      }
      setHighlightedMemberIds(new Set(changedMemberIds));
      highlightTimeoutRef.current = window.setTimeout(() => {
        setHighlightedMemberIds(new Set());
        highlightTimeoutRef.current = null;
      }, 2600);
      setMessages((current) => [
        ...current,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: response.assistant_message,
        },
      ]);
    } catch (caught) {
      const message =
        caught instanceof Error
          ? caught.message
          : "I’m having trouble reaching the recommendation service.";
      setError(message);
      setMessages((current) => [
        ...current,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content:
            "I’m having trouble reaching the recommendation service. Please try again in a moment.",
        },
      ]);
    } finally {
      setIsSending(false);
    }
  }

  return (
    <main className="h-dvh overflow-hidden bg-[#f4f2ec] text-[#171b18]">
      <div className="grid h-full min-h-0 grid-cols-1 overflow-y-auto lg:grid-cols-[minmax(0,0.92fr)_minmax(360px,1.08fr)] lg:overflow-hidden">
        <ConversationPane
          messages={messages}
          suggestion={topSuggestion}
          isSending={isSending}
          hasRecommendationBoard={Boolean(board)}
          error={error}
          onSend={handleSend}
        />
        <RecommendationBoard
          sessionId={sessionId}
          board={board}
          savedPlanUrl={savedSnapshot?.snapshot_url ?? null}
          isUpdating={isSending && Boolean(board)}
          highlightedMemberIds={highlightedMemberIds}
          onSnapshotCreated={setSavedSnapshot}
        />
      </div>
    </main>
  );
}
