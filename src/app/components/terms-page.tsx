import { useState } from "react";
import { Check } from "lucide-react";
import { NavBar } from "./nav-bar";
import { Footer } from "./footer";
import { ContactModal } from "./contact-modal";

export function TermsPage() {
  const [isContactOpen, setIsContactOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#f4f5f7] text-[#0b0f17]">
      <NavBar onOpenContact={() => setIsContactOpen(true)} />
      <ContactModal isOpen={isContactOpen} onClose={() => setIsContactOpen(false)} />

      <div className="max-w-3xl mx-auto px-6 lg:px-10 py-24">

        <div className="inline-block text-xs tracking-[0.18em] text-[#0b0f17]/50 mb-4">LEGAL</div>
        <h1 className="text-4xl md:text-5xl tracking-tight leading-[1.1] mb-2" style={{ fontWeight: 600 }}>
          Terms &amp;<span style={{ fontWeight: 200 }}> Conditions</span>
        </h1>
        <p className="mt-4 text-sm text-[#0b0f17]/40 mb-10">
          <span className="text-[#0b0f17]/60">Effective Date:</span> May 12, 2026
        </p>

        <p className="text-lg text-[#0b0f17]/60 leading-relaxed mb-14">
          By accessing or using LeadROBOT services, websites, AI voice agents,
          or SMS communications, you agree to these Terms &amp; Conditions.
        </p>

        <Section title="Services">
          <p className="text-[#0b0f17]/60 leading-relaxed">
            LeadROBOT provides AI-powered customer communication tools including
            voice agents, SMS messaging, lead intake, scheduling assistance,
            and related automation services.
          </p>
        </Section>

        <Section title="SMS Terms">
          <div className="space-y-6 text-[#0b0f17]/60 leading-relaxed">
            <p>
              By providing your phone number and opting in through a website form,
              phone conversation, estimate request, or other interaction, you consent
              to receive conversational and customer care messages from LeadROBOT
              and participating businesses.
            </p>
            <div>
              <p className="mb-4">These messages may include:</p>
              <BulletList items={[
                "Appointment confirmations",
                "Estimate follow-ups",
                "Scheduling updates",
                "Missed call responses",
                "Customer support notifications",
                "Service-related communications",
              ]} />
            </div>
            <p>
              Message frequency varies. Message and data rates may apply.
              Reply STOP to opt out. Reply HELP for assistance.
            </p>
            <p>
              Consent to receive messages is not a condition of purchase.
            </p>
          </div>
        </Section>

        <Section title="User Responsibilities">
          <p className="text-[#0b0f17]/60 leading-relaxed">
            You agree not to misuse the platform or attempt unauthorized access
            to systems or data.
          </p>
        </Section>

        <Section title="Intellectual Property">
          <p className="text-[#0b0f17]/60 leading-relaxed">
            All content, branding, software, and materials associated with LeadROBOT
            are the property of LeadROBOT unless otherwise stated.
          </p>
        </Section>

        <Section title="Disclaimer">
          <p className="text-[#0b0f17]/60 leading-relaxed">
            Services are provided "as is" without warranties of any kind.
          </p>
        </Section>

        <Section title="Limitation of Liability">
          <p className="text-[#0b0f17]/60 leading-relaxed">
            LeadROBOT shall not be liable for indirect, incidental,
            or consequential damages arising from use of the platform.
          </p>
        </Section>

        <Section title="Changes to Terms">
          <p className="text-[#0b0f17]/60 leading-relaxed">
            We may update these Terms &amp; Conditions periodically.
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
