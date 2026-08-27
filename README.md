
  # cuteROBOT AI Agency

  This is a code bundle for cuteROBOT AI Agency. The original project is available at https://www.figma.com/design/lH6C2a2FWCes3KP2C6xc9q/cuteROBOT-AI-Agency.

  ## Running the code

  Run `npm i` to install the dependencies.

  Run `npm run dev` to start the development server.

  ## Networking DNA API POC

  This repo includes a headless BXN Networking DNA backend POC for conversational referral sessions.

  The Networking DNA / ConnectROBOT POC uses the cuterobot.ai Supabase project, not the LeadROBOT Supabase project.

  Preview deployments should use the configured ConnectROBOT Vercel project environment variables.

  The `main` branch is the deployment source for the ConnectROBOT Vercel project.

  ### Auth

  Both endpoints require a shared server-side API key. Send either:

  ```http
  Authorization: Bearer <NETWORKING_DNA_API_KEY>
  ```

  or:

  ```http
  x-networking-dna-api-key: <NETWORKING_DNA_API_KEY>
  ```

  ### Create a session

  ```http
  POST /api/networking-dna/session
  Content-Type: application/json
  ```

  Optional body:

  ```json
  {
    "initial_summary": ""
  }
  ```

  Response:

  ```json
  {
    "session_id": "..."
  }
  ```

  ### Send a message

  ```http
  POST /api/networking-dna/session/:id/message
  Content-Type: application/json
  ```

  Body:

  ```json
  {
    "message": "A married couple just moved to Austin..."
  }
  ```

  Response:

  ```json
  {
    "session_id": "...",
    "assistant_message": "...",
    "structured_context": {},
    "recommendation_board": {},
    "open_questions": []
  }
  ```

  ### Runtime environment

  Required:

  - `NETWORKING_DNA_API_KEY`
  - `OPENAI_API_KEY`
  - `OPENAI_MODEL`
  - `SUPABASE_URL`
  - `SUPABASE_SERVICE_ROLE_KEY`

  Optional:

  - `OPENAI_FINAL_REASONER_MODEL`
  - `NETWORKING_DNA_RECENT_MESSAGE_LIMIT`

  The API uses the existing Supabase `preview_referral_candidates(p_context jsonb, p_limit_per_need integer default 3)` RPC. The scorer remains authoritative for candidate selection and ranking; application code only validates and transforms the returned candidates into the referral board payload.
