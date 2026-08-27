import { useMemo, useState } from "react";

import { createConnectRobotSession, sendConnectRobotMessage } from "./api";
import { ConversationPane } from "./ConversationPane";
import { RecommendationBoard } from "./RecommendationBoard";
import type { ConversationMessage, OpenQuestion, RecommendationBoardData } from "./types";

export function ConnectRobotWorkspace() {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [board, setBoard] = useState<RecommendationBoardData | null>(null);
  const [openQuestions, setOpenQuestions] = useState<OpenQuestion[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const topSuggestion = useMemo(() => openQuestions[0] ?? null, [openQuestions]);

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
      setBoard(response.recommendation_board);
      setOpenQuestions(response.open_questions);
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
          : "ConnectROBOT could not update recommendations.";
      setError(message);
      setMessages((current) => [
        ...current,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: "I could not update the recommendation board. Please try again.",
        },
      ]);
    } finally {
      setIsSending(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#f4f2ec] text-[#171b18]">
      <div className="grid min-h-screen grid-cols-1 lg:grid-cols-[minmax(0,0.92fr)_minmax(360px,1.08fr)]">
        <ConversationPane
          messages={messages}
          suggestion={topSuggestion}
          isSending={isSending}
          error={error}
          onSend={handleSend}
        />
        <RecommendationBoard board={board} isUpdating={isSending && Boolean(board)} />
      </div>
    </main>
  );
}
