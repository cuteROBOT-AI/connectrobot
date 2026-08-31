import {
  FormEvent,
  useEffect,
  useRef,
  useState,
} from "react";
import { ArrowUp, CircleDot, Loader2, RotateCcw } from "lucide-react";

import { Button } from "../components/ui/button";
import { Textarea } from "../components/ui/textarea";
import { CONNECTROBOT_THINKING_ACTIVITIES } from "./thinking";
import type { ConversationMessage, OpenQuestion } from "./types";

interface ConversationPaneProps {
  messages: ConversationMessage[];
  suggestion: OpenQuestion | null;
  isSending: boolean;
  hasRecommendationBoard: boolean;
  onNewConversation: () => void;
  onSend: (message: string) => Promise<void>;
}

export function ConversationPane({
  messages,
  suggestion,
  isSending,
  hasRecommendationBoard,
  onNewConversation,
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
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#787065]">
              BXN ConnectROBOT
            </p>
            <h1 className="text-2xl font-semibold text-[#171b18]">
              What’s going on?
            </h1>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onNewConversation}
            disabled={isSending}
            className="mt-0.5 border-[#d7d0c3] bg-[#f7f5ef] text-xs font-semibold text-[#5f675f] shadow-none transition-colors hover:border-[#c8b678] hover:bg-[#fbf7eb] hover:text-[#26302a]"
            title={
              isSending
                ? "Wait for the current message to finish"
                : "Start a new conversation"
            }
          >
            <RotateCcw className="size-3.5" />
            New conversation
          </Button>
        </div>
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

          {isSending ? <ThinkingCard compact={hasRecommendationBoard} /> : null}

          <div ref={threadEndRef} />
        </div>
      </div>

      <div className="shrink-0 border-t border-[#ddd8ce] bg-[#f4f2ec]/95 px-5 py-4 backdrop-blur">
        <div className="mx-auto max-w-3xl">
          {suggestion ? (
            <div className="mb-3 rounded-md border border-[#d7c38b] bg-[#fffaf0] px-4 py-3 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#7a6125]">
                This would help me narrow it down
              </p>
              <p className="mt-1 text-sm leading-5 text-[#243049]">{suggestion.question}</p>
            </div>
          ) : null}

          <form onSubmit={submitMessage} className="relative">
            <Textarea
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="Tell me what is happening..."
              className="min-h-24 resize-none border-[#cfc8bb] bg-white pb-4 pl-5 pr-20 pt-4 text-[#1f2722] shadow-sm"
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
              className="absolute right-3 top-1/2 size-10 -translate-y-1/2 bg-[#1f6f61] hover:bg-[#19594e]"
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

function ThinkingCard({ compact }: { compact: boolean }) {
  const prefersReducedMotion = usePrefersReducedMotion();
  const [activityIndex, setActivityIndex] = useState(0);
  const activity = CONNECTROBOT_THINKING_ACTIVITIES[activityIndex];

  useEffect(() => {
    if (prefersReducedMotion) {
      setActivityIndex(0);
      return;
    }

    const interval = window.setInterval(() => {
      setActivityIndex(
        (current) => (current + 1) % CONNECTROBOT_THINKING_ACTIVITIES.length,
      );
    }, 3600);

    return () => window.clearInterval(interval);
  }, [prefersReducedMotion]);

  return (
    <div
      className={
        compact
          ? "mr-auto w-full max-w-[88%] rounded-md border border-[#d8d0bd] bg-white px-4 py-3 text-[#243049] shadow-sm"
          : "mr-auto w-full rounded-md border border-[#d8d0bd] bg-white px-5 py-5 text-[#243049] shadow-sm"
      }
    >
      <div className={compact ? "flex items-center gap-4" : "grid gap-5 md:grid-cols-[260px_1fr]"}>
        <ConnectRobotNetworkAnimation compact={compact} />
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-[#7a6125]">
            <CircleDot className="size-3 text-[#2f8b78]" />
            ConnectROBOT is thinking
          </div>
          <div
            key={prefersReducedMotion ? "reduced-motion" : activity?.title}
            className="connectrobot-thinking-activity mt-3"
          >
            <p className="text-sm font-semibold leading-5 text-[#17213a]">
              {activity?.title}
            </p>
            <p
              className={
                compact
                  ? "mt-1 text-xs leading-5 text-[#69706a]"
                  : "mt-1 text-sm leading-6 text-[#59625b]"
              }
            >
              {activity?.description}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function ConnectRobotNetworkAnimation({ compact }: { compact: boolean }) {
  return (
    <div
      className={
        compact
          ? "connectrobot-network-stage connectrobot-network-stage-compact hidden shrink-0 sm:block"
          : "connectrobot-network-stage"
      }
      aria-hidden="true"
    >
      <svg className="connectrobot-network" viewBox="0 0 200 160" role="img">
        <line className="network-link link-a" x1="40.75" y1="42.29" x2="79.75" y2="67.11" />
        <line className="network-link link-b" x1="120.8" y1="68.03" x2="158.2" y2="46.49" />
        <line className="network-link link-c" x1="119.2" y1="94.4" x2="148.8" y2="116.6" />
        <line className="network-link link-d" x1="40.75" y1="117.71" x2="79.75" y2="92.89" />
        <line className="network-link link-e" x1="40.59" y1="42.54" x2="148.59" y2="116.9" />
        <line className="network-link link-f" x1="51" y1="80" x2="76" y2="80" />
        <line className="network-link link-g" x1="50.68" y1="77.92" x2="157.41" y2="44.68" />
        <circle className="network-node node-a" cx="34" cy="38" r="8" />
        <circle className="network-node node-b" cx="34" cy="122" r="8" />
        <circle className="network-node node-c candidate" cx="166" cy="42" r="9" />
        <circle className="network-node node-d candidate" cx="156" cy="122" r="9" />
        <circle className="network-node node-e" cx="44" cy="80" r="7" />
        <circle className="network-hub-ring" cx="100" cy="80" r="24" />
      </svg>
      <img
        src="/connectROBOT_mark_solid.svg"
        alt=""
        className="connectrobot-omi-hub"
        draggable={false}
      />
    </div>
  );
}

function usePrefersReducedMotion(): boolean {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const query = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    if (!query) return;

    setPrefersReducedMotion(query.matches);
    const handleChange = () => setPrefersReducedMotion(query.matches);
    query.addEventListener("change", handleChange);

    return () => query.removeEventListener("change", handleChange);
  }, []);

  return prefersReducedMotion;
}
