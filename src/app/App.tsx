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
import favicon from "../imports/cuteROBOT_mark_reverse-2.svg?url";

export default function App() {
  const [isVideoOpen, setIsVideoOpen] = useState(false);

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

  const openVideo = () => setIsVideoOpen(true);
  const closeVideo = () => setIsVideoOpen(false);

  return (
    <div className="min-h-screen bg-[#0b0f17]">
      <NavBar />
      <Hero onOpenVideo={openVideo} />
      <MetricsBar />
      <Product onOpenVideo={openVideo} />
      <Services />
      <HowItWorks />
      <Audience />
      <CTA onOpenVideo={openVideo} />
      <Footer />
      <VideoModal isOpen={isVideoOpen} onClose={closeVideo} />
    </div>
  );
}
