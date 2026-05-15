import { useEffect, useState } from "react";
import { NavBar } from "./components/nav-bar";
import { Hero } from "./components/hero";
import { MetricsBar } from "./components/metrics-bar";
import { Product } from "./components/product";
import { Services } from "./components/services";
import { HowItWorks } from "./components/how-it-works";
import { Audience } from "./components/audience";
import { CTA } from "./components/cta";
import { Footer } from "./components/footer";
import { VideoModal } from "./components/video-modal";
import { ContactModal } from "./components/contact-modal";
import { PrivacyPage } from "./components/privacy-page";
import { TermsPage } from "./components/terms-page";
import favicon from "../imports/cuteROBOT_mark_reverse-2.svg?url";

export default function App() {
  const [isVideoOpen, setIsVideoOpen] = useState(false);
  const [isContactOpen, setIsContactOpen] = useState(false);
  const [path, setPath] = useState(window.location.pathname);

  useEffect(() => {
    let link = document.querySelector("link[rel*='icon']") as HTMLLinkElement;
    if (!link) {
      link = document.createElement("link");
      link.rel = "icon";
      document.head.appendChild(link);
    }
    link.type = "image/svg+xml";
    link.href = favicon;
  }, []);

  useEffect(() => {
    const onPop = () => setPath(window.location.pathname);
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  useEffect(() => {
    const hash = window.location.hash;
    if (!hash) return;
    const target = document.querySelector(hash);
    if (target) {
      target.scrollIntoView({ behavior: "instant" });
    }
  });


  if (path === "/privacy") return <PrivacyPage />;
  if (path === "/terms") return <TermsPage />;

  const openVideo = () => setIsVideoOpen(true);
  const closeVideo = () => setIsVideoOpen(false);
  const openContact = () => setIsContactOpen(true);
  const closeContact = () => setIsContactOpen(false);

  return (
    <div className="min-h-screen bg-[#0b0f17]">
      <NavBar onOpenContact={openContact} />
      <Hero onOpenVideo={openVideo} onOpenContact={openContact} />
      <MetricsBar />
      <Product onOpenVideo={openVideo} />
      <Services />
      <HowItWorks />
      <Audience />
      <CTA onOpenVideo={openVideo} onOpenContact={openContact} />
      <Footer />
      <VideoModal isOpen={isVideoOpen} onClose={closeVideo} />
      <ContactModal isOpen={isContactOpen} onClose={closeContact} />
    </div>
  );
}
