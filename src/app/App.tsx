import { useEffect, useState } from "react";

import { ConnectRobotWorkspace } from "./connectrobot/ConnectRobotWorkspace";
import { ReferralPlanView } from "./connectrobot/ReferralPlanView";
import { PrivacyPage } from "./components/privacy-page";
import { TermsPage } from "./components/terms-page";
import favicon from "../imports/cuteROBOT_mark_reverse-2.svg?url";

export default function App() {
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
    document.title = "BXN ConnectROBOT";
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
  if (path.startsWith("/r/")) {
    const token = decodeURIComponent(path.replace(/^\/r\//, "").split("/")[0] ?? "");
    return <ReferralPlanView token={token} />;
  }

  return <ConnectRobotWorkspace />;
}
