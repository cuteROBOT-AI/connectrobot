import image_hero_cuteROBOT_radial_2x_1 from '@/imports/hero_cuteROBOT_radial_2x-1.png'
import { motion } from "motion/react";
import { ArrowRight, PhoneCall } from "lucide-react";
import heroRobot from "../../imports/cuterobot_ball.png";

interface HeroProps {
  onOpenVideo: () => void;
  onOpenContact: () => void;
}

export function Hero({ onOpenVideo, onOpenContact }: HeroProps) {
  return (
    <section className="relative overflow-hidden bg-[#0b0f17] text-white">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-40 -left-40 w-[500px] h-[500px] rounded-full bg-[#22d3ee]/10 blur-3xl" />
        <div className="absolute top-1/3 -right-40 w-[600px] h-[600px] rounded-full bg-[#caff5a]/10 blur-3xl" />
        <div
          className="absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.6) 1px, transparent 1px)",
            backgroundSize: "56px 56px",
            maskImage: "radial-gradient(ellipse at center, black 30%, transparent 75%)",
          }}
        />
      </div>

      <div className="relative max-w-7xl mx-auto px-6 lg:px-10 pt-16 pb-24 lg:pt-24 lg:pb-32 grid lg:grid-cols-12 gap-10 items-center">
        <div className="lg:col-span-6 z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/10 bg-white/[0.03] text-xs text-white/70 mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-[#caff5a] animate-pulse" />
            Every conversation becomes an organized lead
          </div>

          <h1
            className="text-5xl md:text-6xl lg:text-7xl tracking-tight leading-[1.05]"
            style={{ fontWeight: 600 }}
          >
            AI that works.
            <br />
            <span className="text-[#caff5a]">For you.</span>
          </h1>

          <p className="mt-6 text-lg text-white/60 max-w-xl leading-relaxed">
            Smart voice agents, automated lead capture, and custom AI systems designed
            to turn missed opportunities into revenue.
          </p>

          <div className="mt-9 flex flex-col sm:flex-row gap-3">
            <button
              onClick={onOpenVideo}
              className="group inline-flex items-center justify-center gap-2 bg-[#caff5a] text-[#0b0f17] px-6 py-3.5 rounded-full hover:shadow-[0_0_32px_rgba(202,255,90,0.5)] transition-all"
            >See LeadROBOT in Action<ArrowRight size={18} className="group-hover:translate-x-0.5 transition-transform" /></button>
            <button
              onClick={onOpenContact}
              className="inline-flex items-center justify-center gap-2 border border-white/15 text-white px-6 py-3.5 rounded-full hover:bg-white/5 transition-colors"
            >
              <PhoneCall size={16} />
              Book a Call
            </button>
          </div>

          {/*<div className="mt-10 flex items-center gap-6 text-xs text-white/40">
            <span>Trusted by:</span>
            <span className="tracking-widest">Perfume Therapy</span>
            <span className="tracking-widest hidden sm:inline">Jose Canales Landscaping</span>
          </div>*/}
        </div>

        <div className="lg:col-span-6 relative flex justify-center items-end">
          <motion.div
            initial={{ y: 0 }}
            animate={{ y: [0, -16, 0] }}
            transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
            className="relative"
          >
            <div className="absolute inset-0 -z-10 rounded-full bg-[radial-gradient(circle,rgba(202,255,90,0.25)_0%,transparent_60%)] blur-2xl scale-110" />
            <img
              src={image_hero_cuteROBOT_radial_2x_1}
              alt="cuterobot"
              className="w-[255px] sm:w-[330px] lg:w-[405px] drop-shadow-[0_30px_60px_rgba(34,211,238,0.25)]"
            />
          </motion.div>

          {/*<div className="absolute top-6 left-6 hidden md:flex items-center gap-2 px-3 py-2 rounded-xl bg-white/[0.04] border border-white/10 backdrop-blur-md text-xs">
            <span className="w-2 h-2 rounded-full bg-[#caff5a]" />
            Live · Call answered in 0.4s
          </div>
          <div className="absolute bottom-10 right-2 hidden md:block px-3 py-2 rounded-xl bg-white/[0.04] border border-white/10 backdrop-blur-md text-xs">
            <div className="text-white/60">New lead captured</div>
            <div className="text-[#caff5a]">+ $1,240 pipeline</div>
          </div>*/}
        </div>
      </div>
    </section>
  );
}
