import { useState } from "react";
import { Menu, X } from "lucide-react";
import logo from "../../imports/cuterobot_logo_reverse.svg?url";

export function NavBar() {
  const [open, setOpen] = useState(false);
  const links = [
    { label: "Product", href: "#product" },
    { label: "Services", href: "#services" },
    { label: "How it works", href: "#how" },
    { label: "Made for you", href: "#audience" },
  ];

  return (
    <header className="sticky top-0 z-50 backdrop-blur-md bg-[#0b0f17]/70 border-b border-white/5">
      <div className="max-w-7xl mx-auto px-6 lg:px-10 h-16 flex items-center justify-between">
        <a href="#" className="flex items-center gap-2">
          <img src={logo} alt="cuterobot.ai" className="h-4" />
        </a>

        <nav className="hidden md:flex items-center gap-8 text-sm text-white/70">
          {links.map((l) => (
            <a key={l.href} href={l.href} className="hover:text-white transition-colors">
              {l.label}
            </a>
          ))}
        </nav>

        <div className="hidden md:flex items-center gap-3">
          <a href="#cta" className="text-sm text-white/80 hover:text-white px-3 py-2">
            Sign in
          </a>
          <a
            href="#cta"
            className="text-sm bg-[#caff5a] text-[#0b0f17] px-4 py-2 rounded-full hover:shadow-[0_0_24px_rgba(202,255,90,0.45)] transition-shadow"
          >
            Book a Call
          </a>
        </div>

        <button
          onClick={() => setOpen(!open)}
          className="md:hidden text-white/80"
          aria-label="Toggle menu"
        >
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {open && (
        <div className="md:hidden border-t border-white/5 bg-[#0b0f17]/95 px-6 py-4 flex flex-col gap-4 text-white/80">
          {links.map((l) => (
            <a key={l.href} href={l.href} onClick={() => setOpen(false)}>
              {l.label}
            </a>
          ))}
          <a
            href="#cta"
            className="bg-[#caff5a] text-[#0b0f17] px-4 py-2 rounded-full text-center"
            onClick={() => setOpen(false)}
          >
            Book a Call
          </a>
        </div>
      )}
    </header>
  );
}