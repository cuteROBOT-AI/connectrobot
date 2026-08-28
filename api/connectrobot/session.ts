import networkingDnaSession from "../networking-dna/session.js";

import { forwardToProtectedNetworkingDnaEndpoint } from "./proxy.js";

export default {
  async fetch(request: Request) {
    return forwardToProtectedNetworkingDnaEndpoint(
      request,
      "/api/networking-dna/session",
      networkingDnaSession.fetch,
    );
  },
};
