import { useState } from "react";
import { Check } from "lucide-react";
import { NavBar } from "./nav-bar";
import { Footer } from "./footer";
import { ContactModal } from "./contact-modal";

export function PrivacyPage() {
  const [isContactOpen, setIsContactOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#f4f5f7] text-[#0b0f17]">
      <NavBar onOpenContact={() => setIsContactOpen(true)} />
      <ContactModal isOpen={isContactOpen} onClose={() => setIsContactOpen(false)} />

      <div className="max-w-3xl mx-auto px-6 lg:px-10 py-24">

        <div className="inline-block text-xs tracking-[0.18em] text-[#0b0f17]/50 mb-4">LEGAL</div>
        <h1 className="text-4xl md:text-5xl tracking-tight leading-[1.1] mb-2" style={{ fontWeight: 600 }}>
          Privacy<span style={{ fontWeight: 200 }}> Policy</span>
        </h1>
        <p className="mt-4 text-sm text-[#0b0f17]/40 mb-10">
          <span className="text-[#0b0f17]/60">Effective Date:</span> May 12, 2026
        </p>

        <p className="text-lg text-[#0b0f17]/60 leading-relaxed mb-14">
          LeadROBOT ("we," "our," or "us") respects your privacy and is committed
          to protecting the information you provide when using our website,
          AI-powered communication services, and related platforms.
        </p>

        <Section title="Information We Collect">
          <BulletList items={[
            "Name",
            "Phone number",
            "Email address",
            "Service inquiry details",
            "Call recordings and transcripts",
            "Appointment and scheduling information",
            "Technical information such as IP address and browser type",
          ]} />
        </Section>

        <Section title="How We Use Information">
          <BulletList items={[
            "Respond to inquiries and estimate requests",
            "Provide customer support",
            "Schedule appointments and send reminders",
            "Deliver SMS and voice communications",
            "Improve our services and platform performance",
            "Maintain security and prevent abuse",
          ]} />
        </Section>

        <Section title="SMS Communications">
          <div className="space-y-4 text-[#0b0f17]/60 leading-relaxed">
            <p>
              By providing your phone number and opting in, you consent to receive
              conversational and customer care text messages from LeadROBOT and
              participating businesses.
            </p>
            <p>
              Message frequency may vary. Message and data rates may apply.
              Reply STOP to opt out. Reply HELP for assistance.
            </p>
            <p>
              SMS consent is not shared with third parties or affiliates for marketing purposes.
            </p>
          </div>
        </Section>

        <Section title="Sharing of Information">
          <p className="text-[#0b0f17]/60 leading-relaxed">
            We do not sell personal information. We may share information with trusted
            service providers solely for the purpose of operating our services.
          </p>
        </Section>

        <Section title="Data Security">
          <p className="text-[#0b0f17]/60 leading-relaxed">
            We implement reasonable safeguards to protect personal information.
          </p>
        </Section>

        <Section title="Your Rights">
          <p className="text-[#0b0f17]/60 leading-relaxed">
            You may request access to, correction of, or deletion of your personal information.
          </p>
        </Section>

        <Section title="Contact" last>
          <div className="text-[#0b0f17]/60 leading-relaxed">
            <p>LeadROBOT</p>
            <a
              href="mailto:support@getleadrobot.com"
              className="text-[#0b0f17] underline underline-offset-2 hover:opacity-70 transition-opacity"
            >
              support@getleadrobot.com
            </a>
          </div>
        </Section>

      </div>

      <Footer />
    </div>
  );
}

function Section({ title, children, last }: { title: string; children: React.ReactNode; last?: boolean }) {
  return (
    <section className={last ? "mb-0" : "mb-12"}>
      <h2 className="text-xs tracking-[0.18em] text-[#0b0f17]/50 mb-4">{title.toUpperCase()}</h2>
      {children}
    </section>
  );
}

function BulletList({ items }: { items: string[] }) {
  return (
    <ul className="space-y-3">
      {items.map((item) => (
        <li key={item} className="flex items-center gap-3 text-[#0b0f17]/80">
          <span className="w-5 h-5 rounded-full bg-[#0b0f17] text-[#caff5a] flex items-center justify-center flex-shrink-0">
            <Check size={12} strokeWidth={3} />
          </span>
          {item}
        </li>
      ))}
    </ul>
  );
}
