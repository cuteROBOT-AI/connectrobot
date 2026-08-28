import { FormEvent, useState } from "react";
import { Loader2, MessageSquareText, X } from "lucide-react";

import { Button } from "../components/ui/button";

interface TextReferralPlanModalProps {
  isOpen: boolean;
  isSubmitting: boolean;
  error: string | null;
  onClose: () => void;
  onSubmit: (input: { name: string; phone: string }) => Promise<void>;
}

export function TextReferralPlanModal({
  isOpen,
  isSubmitting,
  error,
  onClose,
  onSubmit,
}: TextReferralPlanModalProps) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");

  if (!isOpen) return null;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) return;
    await onSubmit({ name: name.trim(), phone: phone.trim() });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#131713]/35 px-4">
      <div className="w-full max-w-md rounded-md border border-[#d8ddd6] bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-[#e7e3da] px-5 py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#68716b]">
              ConnectROBOT
            </p>
            <h2 className="text-lg font-semibold text-[#19201c]">
              Text your referral plan
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-[#68716b] hover:bg-[#f2f0eb] hover:text-[#19201c]"
            title="Close"
            disabled={isSubmitting}
          >
            <X className="size-4" />
          </button>
        </div>

        <form onSubmit={submit} className="space-y-4 px-5 py-5">
          <label className="block text-sm font-medium text-[#26302a]">
            Name
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="mt-1 h-10 w-full rounded-md border border-[#cfc8bb] px-3 text-sm outline-none focus:border-[#1f6f61]"
              disabled={isSubmitting}
              required
            />
          </label>

          <label className="block text-sm font-medium text-[#26302a]">
            Mobile number
            <input
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              className="mt-1 h-10 w-full rounded-md border border-[#cfc8bb] px-3 text-sm outline-none focus:border-[#1f6f61]"
              disabled={isSubmitting}
              inputMode="tel"
              required
            />
          </label>

          {error ? (
            <p className="rounded-md border border-[#edd3d0] bg-[#fff6f4] px-3 py-2 text-sm text-[#8b312a]">
              {error}
            </p>
          ) : null}

          <Button
            type="submit"
            className="w-full bg-[#1f6f61] hover:bg-[#19594e]"
            disabled={isSubmitting || !name.trim() || !phone.trim()}
          >
            {isSubmitting ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <MessageSquareText className="size-4" />
            )}
            Text my recommendations
          </Button>
        </form>
      </div>
    </div>
  );
}
