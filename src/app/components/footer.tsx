import { Twitter, Linkedin, Github, Phone } from "lucide-react";
import logo from "../../imports/cuteROBOT_logo_solid.svg?url";
import logoMark from "../../imports/cuteROBOT_mark_reverse-2.svg?url";

export function Footer() {
  return (
    <footer className="bg-[#0b0f17] text-white border-t border-white/5">
      <div className="max-w-7xl mx-auto px-6 lg:px-10 py-12 grid md:grid-cols-12 gap-8 items-start">
        <div className="md:col-span-5">
          <div className="flex items-center gap-2 mb-4">
            <img src={logoMark} alt="" className="h-11 w-11 rounded-md p-1" />
            
          </div>
          <p className="text-sm max-w-md text-[#caff5a]">We answer your calls. We capture your leads. We work for you.</p>
        </div>

        <div className="md:col-span-2">
          <div className="text-xs tracking-[0.18em] text-white/30 mb-4">PRODUCT</div>
          <ul className="space-y-2 text-sm text-white/60">
            <li><a href="#product">LeadRobot</a></li>
            <li><a href="#services">Services</a></li>
            <li><a href="#how">How it works</a></li>
          </ul>
        </div>

        <div className="md:col-span-2">
          <div className="text-xs tracking-[0.18em] text-white/30 mb-4">COMPANY</div>
          <ul className="space-y-2 text-sm text-white/60">
            <li><a href="#">About</a></li>
            <li><a href="#">Contact</a></li>
          </ul>
        </div>

        <div className="md:col-span-3">
          <div className="text-xs tracking-[0.18em] text-white/30 mb-4">FOLLOW</div>
          <div className="flex gap-3">
            {[Twitter, Linkedin, Github].map((Icon, i) => (
              <a
                key={i}
                href="#"
                className="w-9 h-9 rounded-full border border-white/10 flex items-center justify-center text-white/60 hover:text-[#caff5a] hover:border-[#caff5a]/40 transition-colors"
              >
                <Icon size={15} />
              </a>
            ))}
          </div>
          <p style={{ marginTop: "22px" }}><a href="tel:+18787876268" className="group hover:text-[#caff5a] transition-colors inline-flex items-center gap-2"><Phone size={14} /><span className="group-hover:hidden">(878) 78-ROBOT</span><span className="hidden group-hover:inline">(878) 787-6268</span></a></p>
        </div>
      </div>

      <div className="border-t border-white/5">
        <div className="max-w-7xl mx-auto px-6 lg:px-10 py-5 flex flex-col sm:flex-row gap-3 justify-between text-xs text-white/40">
          <div>© {new Date().getFullYear()} cuteROBOT AI Agency — All systems operational.</div>
          <div className="flex gap-5">
            <a href="/terms">Terms</a>
            <a href="/privacy">Privacy</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
