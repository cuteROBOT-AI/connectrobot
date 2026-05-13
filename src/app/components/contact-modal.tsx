import { useState, useEffect } from "react";
import { X, Phone, ChevronDown, ChevronUp, Check } from "lucide-react";

interface ContactModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ContactModal({ isOpen, onClose }: ContactModalProps) {
  const [isFormExpanded, setIsFormExpanded] = useState(false);
  const [isMobile, setIsMobile] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const response = await fetch("https://n8n.cuterobot.ai/webhook-test/b2f6d410-939e-4f68-8532-676c5a4770e5", {
        method: "POST",
        mode: "cors",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const text = await response.text();
      const data = text ? JSON.parse(text) : {};

      if (data.success) {
        setSuccessMessage(data.message);
        setIsSuccess(true);
      } else {
        alert("Something went wrong. Please try again.");
      }
    } catch (error) {
      console.error("Form submission error:", error);
      alert("Failed to submit form. Please try calling us directly at 878-787-6268.");
    } finally {
      setIsSubmitting(false);
    }
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
          {isSuccess ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 rounded-full bg-[#caff5a]/20 flex items-center justify-center mx-auto mb-6">
                <Check size={40} className="text-[#caff5a]" strokeWidth={3} />
              </div>
              <h2 className="text-3xl md:text-4xl text-white tracking-tight mb-4" style={{ fontWeight: 600 }}>
                Success!
              </h2>
              <p className="text-lg text-white/70">
                {successMessage}
              </p>
            </div>
          ) : (
            <>
              <h2 className="text-3xl md:text-4xl text-white tracking-tight" style={{ fontWeight: 600 }}>
                Let's get this project started
              </h2>

              {isMobile ? (
                <a
                  href="tel:+18787876268"
                  className="mt-8 group inline-flex items-center justify-center gap-3 w-full bg-[#caff5a] text-[#0b0f17] px-6 py-4 rounded-full hover:shadow-[0_0_32px_rgba(202,255,90,0.5)] transition-all text-lg"
                  style={{ fontWeight: 500 }}
                >
                  <Phone size={20} />
                  Talk to Deb, our friendly virtual assistant
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
                    878-787-6268
                  </a>
                </div>
              )}

              <div className="flex items-center justify-center" style={{ marginTop: "33px", marginBottom: "33px" }}>
                <div className="w-24 h-px bg-white/10"></div>
              </div>

              <button
                onClick={() => setIsFormExpanded(!isFormExpanded)}
                className="flex items-center justify-center gap-2 w-full text-white/60 hover:text-white transition-colors text-sm"
              >
                or, complete this quick form
                {isFormExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>

              {isFormExpanded && (
                <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                  <div>
                    <label htmlFor="fullName" className="block text-sm text-white/60 mb-1.5">
                      Full Name <span className="text-[#caff5a]">*</span>
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
                      type="text"
                      id="phone"
                      required
                      minLength={10}
                      pattern="[\d\s\-\.\(\)]+.*"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-white placeholder-white/30 focus:outline-none focus:border-[#caff5a]/50 transition-colors"
                      placeholder="(555) 123-4567"
                      title="Please enter a valid phone number (at least 10 characters)"
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
                    disabled={isSubmitting}
                    className="w-full bg-[#0b0f17] border border-white/15 text-white px-6 py-3 rounded-full hover:bg-white/5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{ fontWeight: 500 }}
                  >
                    {isSubmitting ? "SENDING..." : "SEND IT!"}
                  </button>
                </form>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
