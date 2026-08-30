import {
  FormEvent,
  useEffect,
  useRef,
  useState,
} from "react";
import { ArrowUp, CircleDot, Loader2 } from "lucide-react";

import { Button } from "../components/ui/button";
import { Textarea } from "../components/ui/textarea";
import { CONNECTROBOT_THINKING_ACTIVITIES } from "./thinking";
import type { ConversationMessage, OpenQuestion } from "./types";

interface ConversationPaneProps {
  messages: ConversationMessage[];
  suggestion: OpenQuestion | null;
  isSending: boolean;
  hasRecommendationBoard: boolean;
  error: string | null;
  onSend: (message: string) => Promise<void>;
}

export function ConversationPane({
  messages,
  suggestion,
  isSending,
  hasRecommendationBoard,
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
      <div className={compact ? "flex items-center gap-4" : "grid gap-5 md:grid-cols-[180px_1fr]"}>
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
          ? "relative hidden h-24 w-24 shrink-0 overflow-hidden rounded-md border border-[#e1d7bc] bg-[#f8f5ed] sm:block"
          : "relative h-40 overflow-hidden rounded-md border border-[#e1d7bc] bg-[#f8f5ed]"
      }
      aria-hidden="true"
    >
      <svg className="connectrobot-network" viewBox="0 0 180 140" role="img">
        <line className="network-link link-a" x1="34" y1="38" x2="86" y2="70" />
        <line className="network-link link-b" x1="86" y1="70" x2="144" y2="42" />
        <line className="network-link link-c" x1="86" y1="70" x2="132" y2="104" />
        <line className="network-link link-d" x1="34" y1="102" x2="86" y2="70" />
        <line className="network-link link-e" x1="34" y1="38" x2="132" y2="104" />
        <circle className="network-node node-a" cx="34" cy="38" r="7" />
        <circle className="network-node node-b" cx="34" cy="102" r="7" />
        <circle className="network-node node-c candidate" cx="144" cy="42" r="8" />
        <circle className="network-node node-d candidate" cx="132" cy="104" r="8" />
        <circle className="network-core" cx="86" cy="70" r="11" />
        <path
          className="omi-mark"
          d="M83 65h6c4 0 7 3 7 7s-3 7-7 7h-6c-4 0-7-3-7-7s3-7 7-7Zm0 4a3 3 0 0 0 0 6h6a3 3 0 0 0 0-6h-6Z"
        />
      </svg>
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
