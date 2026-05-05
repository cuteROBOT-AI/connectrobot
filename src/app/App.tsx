import { NavBar } from "./components/nav-bar";
import { Hero } from "./components/hero";
import { MetricsBar } from "./components/metrics-bar";
import { Product } from "./components/product";
import { Services } from "./components/services";
import { HowItWorks } from "./components/how-it-works";
import { Audience } from "./components/audience";
import { CTA } from "./components/cta";
import { Footer } from "./components/footer";

export default function App() {
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
