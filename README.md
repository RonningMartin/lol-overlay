# League Item Advisor

A React and TypeScript foundation for a situational League of Legends item advisor.
The current development screen reads match data from League's local Live Client Data API.
It also resolves champions and items with Riot's current Data Dragon data and
shows current OP.GG meta data through OP.GG's official MCP server. A manual
OpenAI recommendation test is available below the context preview. The game
overlay will be added in later steps of [PLAN.md](PLAN.md).

## Run locally

Install Node.js 20.19+ or 22.12+ (including Node.js 24) and npm, then run:

```sh
npm install
npm run dev
```

Open the local URL printed by Vite. Use the **Live game** and **Sample game**
buttons on the development dashboard to switch data sources. Live game waits
for a running League match and refreshes about every three seconds; the game
client must run on the same computer as this development server. Sample game
works without League. On the dev server, `?mock=1` opens directly in sample mode.

The dashboard shows game time, your champion, level, items, and available gold,
plus allies and enemies with their champions and items. Expand **Inspect
GameState JSON** to examine the exact internal model displayed on the page.
Both sources use the same `GameState` dashboard and Riot static data enrichment.

The **Current meta · OP.GG MCP** section loads champion analysis for your
champion and recognized role. With Sample game selected, it requests Brand Mid.
It shows ranked champion/role statistics, common core builds, boots, later item
choices, and available matchups. Expand **Inspect MetaProvider JSON** to see the
normalized data. If OP.GG is unavailable, the game dashboard still works and
the meta section shows an error with a Retry button.

The app uses OP.GG's published `lol_get_champion_analysis` MCP tool from the
local Vite server; the browser uses only the local `/api/meta/champion` route.
Results are kept in memory for 30 minutes by champion and role. Live game
updates every few seconds do not refetch meta data. No account or token was
needed for the tested Brand Mid request. The MCP response does not include an
explicit patch number, so the dashboard reports fetch time rather than claiming
a patch. Fourth-, fifth-, and sixth-item lists are purchase frequencies, not
matchup-specific recommendations; small sample counts should be read with care.

The **Prepared match context** section previews the exact typed object used
by the manual OpenAI request. Expand **Inspect exact recommendation context
JSON** to verify the game, current player, other allies, enemies, referenced
item metadata, and OP.GG meta together. The same builder runs for Sample game
and Live game. Item details are listed once by ID, while player inventories
and OP.GG builds reference those IDs. Icons, summoner names, and duplicate raw
API structures are omitted because they are not needed for item reasoning.
If OP.GG or Riot static data is unavailable, the context still appears with
`meta: null` or limited item details, so missing data remains visible. Viewing
the context does not call OpenAI or choose items.

The **Structured recommendation preview** section shows a static Brand
healing-heavy scenario, its Zod validation result, and the instruction template
planned for a future model call. Expand the two inspectors to read the exact
mock `RecommendationResult` JSON and instruction text. The mock is independent
of the currently displayed match. Its Morellonomicon (3165), Blackfire Torch
(2503), and Rylai's Crystal Scepter (3116) IDs were checked against the current
Riot Data Dragon catalog when this step was built. A successful result requires
exactly three distinct positive integer item IDs, allowed priorities, short
single-line reasons, and no extra fields. This is structural validation;
checking that a model's items actually exist and fit the current game belongs
to a later validation step. The static preview itself makes no OpenAI request.

## Test an OpenAI recommendation

Copy `.env.example` to `.env`, replace `OPENAI_API_KEY` with your own API key,
and restart the development server. `OPENAI_MODEL` is optional and defaults to
`gpt-5.4-mini`. The real `.env` file is ignored by Git. Never prefix the key
with `VITE_`, which would expose it to browser code.

Run `npm run dev`, open the URL printed by Vite, and select **Sample game**
(or add `?mock=1` to the URL). This lets you test Brand Mid without League.
Wait for Riot static data and OP.GG meta to load, then inspect the **Prepared
match context** section. Click **Generate recommendation** in the **OpenAI
recommendation** section. It sends one request on each click, shows a loading
state, and displays a validated three-item JSON result or a readable error.
For a live match, choose **Live game** and use the same control.

The browser POSTs only the compact Step 7 context to `/api/ai/recommendation`.
The local Vite server reads the secret from `.env` or its process environment,
uses the official OpenAI SDK with structured output, and validates the result
against the Step 8 Zod schema before returning it. The key is never sent to
React. `npm run preview` includes the same local endpoint; a plain static
server hosting `dist/` does not. Without a key, clicking the button shows a
clear setup error. The current validation checks structure and brevity; item
existence, ownership, and game-specific eligibility checks are planned for
Step 10. There is no automatic generation or overlay behavior yet.

If OpenAI returns HTTP 429, the debug error includes its safe error code when
available. An exhausted credit balance or spend limit needs a change in your
OpenAI Platform billing or limit settings; a request-rate limit calls for
waiting before another manual attempt. The app does not automatically retry.

The sample view should show Brand's icon and current item details, including price,
description, numeric stats, and available build components. Live games use the
same lookup. If an item is missing from Data Dragon, its live name remains visible.

The app reads Riot's `versions.json` on startup and uses the newest listed Data
Dragon version with `en_US` data. Item and champion files are downloaded once per
app session and shared across refreshes of the match data. Data Dragon can lag a
regional game patch briefly; reloading the page checks the version again.

To run the conversion checks, use:

```sh
npm test
```

To check the production build, run:

```sh
npm run build
```

The production files are written to `dist/`. Use `npm run preview` to test that
build locally with the Live Client Data proxy and OP.GG MCP bridge. Serving
`dist/` with a plain static file server does not provide these local endpoints.
