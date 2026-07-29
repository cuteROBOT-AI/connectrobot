import image_leadrobot_hero from '@/imports/leadrobot_hero.png'
import { motion } from "motion/react";
import { ArrowRight, ExternalLink } from "lucide-react";
import robot from "../../imports/happy_bot_teal2.png";

interface CTAProps {
  onOpenVideo: () => void;
  onOpenContact: () => void;
}

export function CTA({ onOpenVideo, onOpenContact }: CTAProps) {
  return (
    <section id="cta" className="bg-[#0b0f17] text-white">
      <div className="max-w-7xl mx-auto px-6 lg:px-10 pb-24">
        <div className="relative overflow-hidden rounded-[2.5rem] border border-white/10 bg-gradient-to-br from-[#0f1421] via-[#0b0f17] to-[#0f1421] px-8 lg:px-16 py-16 lg:py-20">
          <div className="absolute -top-32 -left-32 w-[400px] h-[400px] rounded-full bg-[#caff5a]/15 blur-3xl" />
          <div className="absolute -bottom-32 -right-32 w-[400px] h-[400px] rounded-full bg-[#22d3ee]/10 blur-3xl" />

          <div className="relative grid lg:grid-cols-12 gap-10 items-center">
            <div className="lg:col-span-7">
              <h2 className="text-5xl md:text-6xl tracking-tight leading-[1.05]" style={{ fontWeight: 600 }}>
                Stop missing leads.
              </h2>
              <p className="mt-5 text-lg text-white/60 max-w-xl">
                Your next customer is already trying to reach you.
              </p>

              <div className="mt-8 flex flex-col sm:flex-row gap-3">
                <button
                  onClick={onOpenVideo}
                  className="group inline-flex items-center justify-center gap-2 bg-[#caff5a] text-[#0b0f17] px-6 py-3.5 rounded-full hover:shadow-[0_0_32px_rgba(202,255,90,0.5)] transition-all"
                >
                  Take a look
                  <ArrowRight size={18} className="group-hover:translate-x-0.5 transition-transform" />
                </button>
                <a
                  href="https://www.leadrobot.app/public/home"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 border border-white/15 text-white px-6 py-3.5 rounded-full hover:bg-white/5 transition-colors"
                >
                  <ExternalLink size={16} />
                  Learn More
                </a>
              </div>
            </div>

            <div className="lg:col-span-5 flex justify-center lg:justify-end">
              <motion.img
                src={image_leadrobot_hero}
                alt=""
                animate={{ y: [0, -10, 0] }}
                transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
                className="h-[280px] drop-shadow-[0_20px_40px_rgba(34,211,238,0.3)]"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
