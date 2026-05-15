import { Mic, Inbox, Workflow, ArrowUpRight } from "lucide-react";

const services = [
  {
    icon: Mic,
    title: "AI Voice Agents",
    desc: "Natural-sounding agents that answer, qualify, and book — on every call.",
    accent: "#caff5a",
  },
  {
    icon: Inbox,
    title: "Lead Capture Systems",
    desc: "Automatically log every inquiry into your CRM with full context.",
    accent: "#22d3ee",
  },
  {
    icon: Workflow,
    title: "Custom AI Workflows",
    desc: "Tailored automations that fit your business — not the other way around.",
    accent: "#ff9a55",
  },
];

export function Services() {
  return (
    <section id="services" className="bg-[#0b0f17] text-white">
      <div className="max-w-7xl mx-auto px-6 lg:px-10 py-24">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-12">
          <div>
            <div className="text-xs tracking-[0.18em] text-white/40 mb-4">SERVICES</div>
            <h2 className="text-4xl md:text-5xl tracking-tight leading-[1.1] max-w-2xl" style={{ fontWeight: 600 }}>
              Built for ops. <span className="text-white/40">Tuned for revenue.</span>
            </h2>
          </div>
          <p className="text-white/50 max-w-md">
            Three core systems. Plug them in. Watch missed calls become booked jobs.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-5">
          {services.map((s) => (
            <div
              key={s.title}
              className="group relative p-7 rounded-3xl bg-white/[0.025] border border-white/5 hover:border-white/15 transition-all overflow-hidden"
            >
              <div
                className="absolute -top-20 -right-20 w-48 h-48 rounded-full opacity-0 group-hover:opacity-100 transition-opacity blur-3xl"
                style={{ background: s.accent }}
              />
              <div
                className="relative w-12 h-12 rounded-2xl flex items-center justify-center mb-6"
                style={{ background: `${s.accent}20`, color: s.accent }}
              >
                <s.icon size={20} />
              </div>
              <h3 className="text-2xl mb-2 relative" style={{ fontWeight: 600 }}>
                {s.title}
              </h3>
              <p className="text-white/55 leading-relaxed relative">{s.desc}</p>
              {/*<div className="mt-6 flex items-center gap-1 text-sm text-white/70 group-hover:text-white relative">
                Learn more
                <ArrowUpRight size={16} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
              </div>*/}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
