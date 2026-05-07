import { Check, ArrowUpRight, Phone, MessageSquare, Activity } from "lucide-react";

const bullets = [
  "Answers calls 24/7",
  "Captures customer details automatically",
  "Real-time lead dashboard",
  "No missed opportunities",
];

interface ProductProps {
  onOpenVideo: () => void;
}

export function Product({ onOpenVideo }: ProductProps) {
  return (
    <section id="product" className="bg-[#f4f5f7] text-[#0b0f17]">
      <div className="max-w-7xl mx-auto px-6 lg:px-10 py-24 grid lg:grid-cols-12 gap-12 items-center">
        <div className="lg:col-span-7 order-2 lg:order-1">
          <DashboardMock />
        </div>

        <div className="lg:col-span-5 order-1 lg:order-2">
          <div className="inline-block text-xs tracking-[0.18em] text-[#0b0f17]/50 mb-4">
            ◆ PRODUCT
          </div>
          <h2 className="text-4xl md:text-5xl tracking-tight leading-[1.1]" style={{ fontWeight: 600 }}>Meet Lead<span className="text-[#0b0f17]" style={{ fontWeight: 200 }}>ROBOT</span></h2>
          <p className="mt-5 text-lg text-[#0b0f17]/60 leading-relaxed">
            Your AI receptionist that answers every call, captures every lead, and
            follows up instantly.
          </p>

          <ul className="mt-8 space-y-3">
            {bullets.map((b) => (
              <li key={b} className="flex items-center gap-3 text-[#0b0f17]/80">
                <span className="w-5 h-5 rounded-full bg-[#0b0f17] text-[#caff5a] flex items-center justify-center">
                  <Check size={12} strokeWidth={3} />
                </span>
                {b}
              </li>
            ))}
          </ul>

          <button
            onClick={onOpenVideo}
            className="mt-9 inline-flex items-center gap-2 bg-[#0b0f17] text-white px-6 py-3.5 rounded-full hover:bg-[#0b0f17]/90 transition-colors"
          >
            View Demo
            <ArrowUpRight size={18} />
          </button>
        </div>
      </div>
    </section>
  );
}

function DashboardMock() {
  return (
    <div className="relative">
      <div className="absolute -inset-6 -z-10 rounded-[2rem] bg-gradient-to-br from-[#22d3ee]/15 via-transparent to-[#caff5a]/20 blur-2xl" />
      <div className="rounded-3xl bg-white border border-black/5 shadow-[0_20px_60px_-20px_rgba(11,15,23,0.25)] overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 border-b border-black/5 bg-[#fafbfc]">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#ff7a59]" />
            <span className="w-2.5 h-2.5 rounded-full bg-[#ffd166]" />
            <span className="w-2.5 h-2.5 rounded-full bg-[#caff5a]" />
          </div>
          <div className="text-xs text-black/40">leadrobot.app/dashboard</div>
          <div className="text-xs text-black/40">●</div>
        </div>

        <div className="p-6 grid grid-cols-3 gap-4">
          <Stat label="Calls today" value="48" tone="bg-[#0b0f17] text-white" />
          <Stat label="Leads captured" value="32" />
          <Stat label="Pipeline" value="$12.4k" accent />
        </div>

        <div className="px-6 pb-6 space-y-3">
          <div className="text-xs uppercase tracking-wider text-black/40">Recent activity</div>
          <Row icon={Phone} title="Sara M. · Roof inspection" tag="New lead" tone="green" time="2m" />
          <Row icon={MessageSquare} title="James L. · Quote follow-up" tag="Replied" time="9m" />
          <Row icon={Activity} title="Northwind HVAC · Booked" tag="Converted" tone="cyan" time="22m" />
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, tone, accent }: { label: string; value: string; tone?: string; accent?: boolean }) {
  return (
    <div className={`rounded-2xl p-4 border border-black/5 ${tone ?? "bg-[#f4f5f7]"}`}>
      <div className={`text-xs ${tone ? "text-white/60" : "text-black/50"}`}>{label}</div>
      <div className={`text-2xl mt-1 ${accent ? "text-[#0b0f17]" : ""}`} style={{ fontWeight: 600 }}>
        {value}
      </div>
      {accent && <div className="mt-1 h-1 w-12 rounded-full bg-[#caff5a]" />}
    </div>
  );
}

function Row({
  icon: Icon,
  title,
  tag,
  tone,
  time,
}: {
  icon: any;
  title: string;
  tag: string;
  tone?: "green" | "cyan";
  time: string;
}) {
  const tagClass =
    tone === "green"
      ? "bg-[#caff5a]/30 text-[#3a5a00]"
      : tone === "cyan"
      ? "bg-[#22d3ee]/15 text-[#0b6c80]"
      : "bg-black/5 text-black/60";
  return (
    <div className="flex items-center justify-between px-3 py-2.5 rounded-xl bg-[#fafbfc] border border-black/5">
      <div className="flex items-center gap-3">
        <span className="w-8 h-8 rounded-full bg-[#0b0f17] text-white flex items-center justify-center">
          <Icon size={14} />
        </span>
        <span className="text-sm text-black/80">{title}</span>
      </div>
      <div className="flex items-center gap-3">
        <span className={`text-xs px-2 py-0.5 rounded-full ${tagClass}`}>{tag}</span>
        <span className="text-xs text-black/40">{time}</span>
      </div>
    </div>
  );
}
