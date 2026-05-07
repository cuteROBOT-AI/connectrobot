import { TrendingUp, PhoneIncoming, Zap, Clock } from "lucide-react";

const metrics = [
  { icon: TrendingUp, value: "$7,200", label: "in captured revenue / mo avg" },
  { icon: PhoneIncoming, value: "0%", label: "missed customer calls" },
  { icon: Zap, value: "Days", label: "to deploy, not months" },
  { icon: Clock, value: "24/7", label: "always-on coverage" },
];

export function MetricsBar() {
  return (
    <section className="bg-[#0b0f17] border-y border-white/5 text-white">
      <div className="max-w-7xl mx-auto px-6 lg:px-10 py-10 grid grid-cols-2 lg:grid-cols-4 gap-6">
        {metrics.map((m, i) => (
          <div
            key={i}
            className="flex items-center gap-4 px-4 py-3 rounded-2xl bg-white/[0.02] border border-white/5"
          >
            <div className="w-10 h-10 flex items-center justify-center rounded-xl bg-[#caff5a]/10 text-[#caff5a]">
              <m.icon size={18} />
            </div>
            <div>
              <div className="text-xl text-white" style={{ fontWeight: 600 }}>
                {m.value}
              </div>
              <div className="text-xs text-white/50">{m.label}</div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
