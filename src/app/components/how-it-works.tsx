import { Plug, Radio, Target } from "lucide-react";

const steps = [
  { num: "01", icon: Plug, title: "Connect", desc: "We plug into your systems." },
  { num: "02", icon: Radio, title: "Capture", desc: "AI handles calls and inquiries." },
  { num: "03", icon: Target, title: "Convert", desc: "Leads are organized and ready for you." },
];

export function HowItWorks() {
  return (
    <section id="how" className="bg-[#f4f5f7] text-[#0b0f17]">
      <div className="max-w-7xl mx-auto px-6 lg:px-10 py-24">
        <div className="text-center mb-16">
          <div className="text-xs tracking-[0.18em] text-[#0b0f17]/40 mb-4">◆ HOW IT WORKS</div>
          <h2 className="text-4xl md:text-5xl tracking-tight" style={{ fontWeight: 600 }}>
            Three steps. Zero drama.
          </h2>
        </div>

        <div className="relative grid md:grid-cols-3 gap-6">
          <div className="hidden md:block absolute top-12 left-[16%] right-[16%] h-px bg-gradient-to-r from-transparent via-[#0b0f17]/15 to-transparent" />
          {steps.map((s) => (
            <div
              key={s.num}
              className="relative p-7 rounded-3xl bg-white border border-black/5 shadow-[0_10px_30px_-12px_rgba(11,15,23,0.15)]"
            >
              <div className="flex items-center justify-between mb-6">
                <div className="w-12 h-12 rounded-2xl bg-[#0b0f17] text-[#caff5a] flex items-center justify-center">
                  <s.icon size={20} />
                </div>
                <span className="text-sm text-[#0b0f17]/30 tracking-widest">{s.num}</span>
              </div>
              <h3 className="text-2xl mb-2" style={{ fontWeight: 600 }}>
                {s.title}
              </h3>
              <p className="text-[#0b0f17]/60">{s.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
