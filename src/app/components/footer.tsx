import { Phone } from "lucide-react";
import logo from "../../imports/cuteROBOT_logo_solid.svg?url";
import logoMark from "../../imports/cuteROBOT_mark_reverse-2.svg?url";

interface FooterProps {
  onOpenContact: () => void;
}

export function Footer({ onOpenContact }: FooterProps) {
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
            {/* <li><a href="#">About</a></li>*/}
            <li><button onClick={onOpenContact} className="hover:text-white transition-colors">Book a call</button></li>
          </ul>
        </div>

        <div className="md:col-span-3">
          <div className="text-xs tracking-[0.18em] text-white/30 mb-4">FOLLOW</div>
          <div className="flex gap-3">
            <a
              href="https://www.tiktok.com/@cuterobot.ai"
              target="_blank"
              rel="noopener noreferrer"
              className="w-9 h-9 rounded-full border border-white/10 flex items-center justify-center text-white/60 hover:text-[#caff5a] hover:border-[#caff5a]/40 transition-colors"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.69a8.18 8.18 0 0 0 4.78 1.52V6.75a4.85 4.85 0 0 1-1.01-.06z" />
              </svg>
            </a>
            <a
              href="https://www.instagram.com/cuterobot.ai/"
              target="_blank"
              rel="noopener noreferrer"
              className="w-9 h-9 rounded-full border border-white/10 flex items-center justify-center text-white/60 hover:text-[#caff5a] hover:border-[#caff5a]/40 transition-colors"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
              </svg>
            </a>
          </div>
          <p style={{ marginTop: "22px" }}><a href="tel:+18787876268" className="group hover:text-[#caff5a] transition-colors inline-flex items-center gap-2"><Phone size={14} /><span className="group-hover:hidden">(878) 78-ROBOT</span><span className="hidden group-hover:inline">(878) 787-6268</span></a></p>
        </div>
      </div>

      <div className="border-t border-white/5">
        <div className="max-w-7xl mx-auto px-6 lg:px-10 py-5 flex flex-col sm:flex-row gap-3 justify-between text-xs text-white/40">
          <div>© {new Date().getFullYear()} cuteROBOT AI Agency — All systems operational.</div>
          {/*<div className="flex gap-5">
            <a href="/terms">Terms</a>
            <a href="/privacy">Privacy</a>
          </div>*/}
        </div>
      </div>
    </footer>
  );
}
