import { useState, useEffect } from "react";
import { X, Phone, ChevronDown, ChevronUp } from "lucide-react";

interface ContactModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ContactModal({ isOpen, onClose }: ContactModalProps) {
  const [isFormExpanded, setIsFormExpanded] = useState(false);
  const [isMobile, setIsMobile] = useState(true);
  const [formData, setFormData] = useState({
    fullName: "",
    phone: "",
    email: "",
    projectNeeds: "",
  });

  useEffect(() => {
    const checkMobile = () => {
      const userAgent = navigator.userAgent.toLowerCase();
      const isMobileUA = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent);
      const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      const isSmallScreen = window.innerWidth <= 768;

      setIsMobile(isMobileUA || (isTouchDevice && isSmallScreen));
    };

    checkMobile();
  }, []);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Form submission logic would go here
    console.log("Form submitted:", formData);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg mx-4 bg-[#0f1421] border border-white/10 rounded-3xl shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute -top-12 right-0 text-white/70 hover:text-white transition-colors"
          aria-label="Close"
        >
          <X size={32} />
        </button>

        <div className="p-8 lg:p-10">
          <h2 className="text-3xl md:text-4xl text-white tracking-tight" style={{ fontWeight: 600 }}>
            Let's get the conversation started
          </h2>

          {isMobile ? (
            <a
              href="tel:+18787876268"
              className="mt-8 group inline-flex items-center justify-center gap-3 w-full bg-[#caff5a] text-[#0b0f17] px-6 py-4 rounded-full hover:shadow-[0_0_32px_rgba(202,255,90,0.5)] transition-all text-lg"
              style={{ fontWeight: 500 }}
            >
              <Phone size={20} />
              Talk to our virtual assistant, Deb
            </a>
          ) : (
            <div className="mt-8 text-center">
              <p className="text-white/70 text-base mb-4">
                Call Deb, our virtual assistant at:
              </p>
              <a
                href="tel:+18787876268"
                className="inline-flex items-center gap-3 text-[#caff5a] text-3xl hover:text-[#caff5a]/80 transition-colors"
                style={{ fontWeight: 700 }}
              >
                <Phone size={28} />
                878.787.6268
              </a>
            </div>
          )}

          <button
            onClick={() => setIsFormExpanded(!isFormExpanded)}
            className="flex items-center justify-center gap-2 w-full text-white/60 hover:text-white transition-colors text-sm"
            style={{ marginTop: "66px" }}
          >
            or, complete this quick form
            {isFormExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>

          {isFormExpanded && (
            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <div>
                <label htmlFor="fullName" className="block text-sm text-white/60 mb-1.5">
                  Full name <span className="text-[#caff5a]">*</span>
                </label>
                <input
                  type="text"
                  id="fullName"
                  required
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-white placeholder-white/30 focus:outline-none focus:border-[#caff5a]/50 transition-colors"
                  placeholder="Enter your name"
                />
              </div>

              <div>
                <label htmlFor="phone" className="block text-sm text-white/60 mb-1.5">
                  Phone Number <span className="text-[#caff5a]">*</span>
                </label>
                <input
                  type="tel"
                  id="phone"
                  required
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-white placeholder-white/30 focus:outline-none focus:border-[#caff5a]/50 transition-colors"
                  placeholder="(555) 123-4567"
                />
              </div>

              <div>
                <label htmlFor="email" className="block text-sm text-white/60 mb-1.5">
                  Email
                </label>
                <input
                  type="email"
                  id="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-white placeholder-white/30 focus:outline-none focus:border-[#caff5a]/50 transition-colors"
                  placeholder="your@email.com"
                />
              </div>

              <div>
                <label htmlFor="projectNeeds" className="block text-sm text-white/60 mb-1.5">
                  Tell us a bit about your project needs
                </label>
                <textarea
                  id="projectNeeds"
                  rows={3}
                  value={formData.projectNeeds}
                  onChange={(e) => setFormData({ ...formData, projectNeeds: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-white placeholder-white/30 focus:outline-none focus:border-[#caff5a]/50 transition-colors resize-none"
                  placeholder="Brief description of what you're looking for..."
                />
              </div>

              <button
                type="submit"
                className="w-full bg-[#0b0f17] border border-white/15 text-white px-6 py-3 rounded-full hover:bg-white/5 transition-colors"
                style={{ fontWeight: 500 }}
              >
                Send it!
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
