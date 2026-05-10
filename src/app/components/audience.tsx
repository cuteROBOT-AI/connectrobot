import { Wrench, Building2, Briefcase, Rocket } from "lucide-react";

const items = [
  { icon: Wrench, label: "Home service businesses", desc: "Plumbers, HVAC, roofers." },
  { icon: Building2, label: "Local operators", desc: "Multi-location, multi-line." },
  { icon: Briefcase, label: "Agencies", desc: "White-label & resell." },
  { icon: Rocket, label: "Founders", desc: "Solo teams that need leverage." },
];

export function Audience() {
  return (
    <section id="audience" className="bg-[#0b0f17] text-white">
      <div className="max-w-7xl mx-auto px-6 lg:px-10 py-24">
        <div className="text-xs tracking-[0.18em] text-white/40 mb-4">WHO THIS IS FOR</div>
        <h2 className="text-4xl md:text-5xl tracking-tight" style={{ fontWeight: 600 }}>
          If a missed call is lost revenue — <span className="text-[#caff5a]">we're for you.</span>
        </h2>

        <div className="mt-12 grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {items.map((it) => (
            <div
              key={it.label}
              className="p-6 rounded-2xl bg-white/[0.025] border border-white/5 hover:bg-white/[0.05] transition-colors"
            >
              <div className="w-10 h-10 rounded-xl bg-[#caff5a]/10 text-[#caff5a] flex items-center justify-center mb-4">
                <it.icon size={18} />
              </div>
              <div className="text-base text-white" style={{ fontWeight: 500 }}>
                {it.label}
              </div>
              <div className="text-sm text-white/50 mt-1">{it.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
