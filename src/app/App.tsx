import { useEffect } from "react";
import { NavBar } from "./components/nav-bar";
import { Hero } from "./components/hero";
import { MetricsBar } from "./components/metrics-bar";
import { Product } from "./components/product";
import { Services } from "./components/services";
import { HowItWorks } from "./components/how-it-works";
import { Audience } from "./components/audience";
import { CTA } from "./components/cta";
import { Footer } from "./components/footer";
import favicon from "../imports/cuteROBOT_mark_reverse-2.svg?url";

export default function App() {
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

  return (
    <div className="min-h-screen bg-[#0b0f17]">
      <NavBar />
      <Hero />
      <MetricsBar />
      <Product />
      <Services />
      <HowItWorks />
      <Audience />
      <CTA />
      <Footer />
    </div>
  );
}
