import { FormEvent, useEffect, useRef, useState } from "react";
import { ArrowUp, Loader2 } from "lucide-react";

import { Button } from "../components/ui/button";
import { Textarea } from "../components/ui/textarea";
import type { ConversationMessage, OpenQuestion } from "./types";

interface ConversationPaneProps {
  messages: ConversationMessage[];
  suggestion: OpenQuestion | null;
  isSending: boolean;
  error: string | null;
  onSend: (message: string) => Promise<void>;
}

export function ConversationPane({
  messages,
  suggestion,
  isSending,
  error,
  onSend,
}: ConversationPaneProps) {
  const [draft, setDraft] = useState("");
  const threadEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    threadEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length, isSending]);

  async function submitMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const message = draft.trim();
    if (!message || isSending) return;

    setDraft("");
    await onSend(message);
  }

  return (
    <section className="flex min-h-[560px] flex-col bg-[#f4f2ec] max-lg:min-h-[70dvh] lg:h-full lg:min-h-0">
      <div className="shrink-0 border-b border-[#ddd8ce] px-5 py-4">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#787065]">
          BXN ConnectROBOT
        </p>
        <h1 className="text-2xl font-semibold text-[#171b18]">Who can we help today?</h1>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
        <div className="mx-auto flex max-w-3xl flex-col gap-3">
          {messages.length === 0 ? (
            <div className="mt-8 border-l-2 border-[#2f8b78] bg-white px-5 py-4 shadow-sm">
              <p className="text-sm leading-6 text-[#3e4740]">
                Start with what is happening. I’ll build the referral board as we go.
              </p>
            </div>
          ) : null}

          {messages.map((message) => (
            <div
              key={message.id}
              className={
                message.role === "user"
                  ? "ml-auto max-w-[85%] rounded-md bg-[#1f6f61] px-4 py-3 text-sm leading-6 text-white shadow-sm"
                  : "mr-auto max-w-[88%] rounded-md border border-[#ded9cf] bg-white px-4 py-3 text-sm leading-6 text-[#26302a] shadow-sm"
              }
            >
              {message.content}
            </div>
          ))}

          {isSending ? (
            <div className="mr-auto inline-flex items-center gap-2 rounded-md border border-[#ded9cf] bg-white px-3 py-2 text-xs font-medium text-[#657068] shadow-sm">
              <Loader2 className="size-3 animate-spin" />
              Looking across the BXN network...
            </div>
          ) : null}

          <div ref={threadEndRef} />
        </div>
      </div>

      <div className="shrink-0 border-t border-[#ddd8ce] bg-[#f4f2ec]/95 px-5 py-4 backdrop-blur">
        <div className="mx-auto max-w-3xl">
          {suggestion ? (
            <div className="mb-3 rounded-md border border-[#d4e2de] bg-[#edf7f4] px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[#276255]">
                This would help me narrow it down:
              </p>
              <p className="mt-1 text-sm leading-5 text-[#263d37]">{suggestion.question}</p>
            </div>
          ) : null}

          {error ? (
            <div className="mb-3 rounded-md border border-[#edd3d0] bg-[#fff6f4] px-4 py-3 text-sm text-[#8b312a]">
              {error}
            </div>
          ) : null}

          <form onSubmit={submitMessage} className="flex items-end gap-2">
            <Textarea
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="Tell me what is happening..."
              className="min-h-20 border-[#cfc8bb] bg-white text-[#1f2722] shadow-sm"
              disabled={isSending}
              onKeyDown={(event) => {
                if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
                  event.currentTarget.form?.requestSubmit();
                }
              }}
            />
            <Button
              type="submit"
              size="icon"
              className="mb-1 size-10 bg-[#1f6f61] hover:bg-[#19594e]"
              disabled={isSending || draft.trim().length === 0}
              title="Send message"
            >
              {isSending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <ArrowUp className="size-4" />
              )}
            </Button>
          </form>
        </div>
      </div>
    </section>
  );
}
