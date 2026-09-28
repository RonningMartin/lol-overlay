# Project: League of Legends AI Item Recommendation Overlay

## Project goal

Build a League of Legends overlay that analyzes the current match and gives situational item recommendations.

The application should NOT rely on a large manually maintained recommendation engine.

Instead, the architecture should be:

League Live Client Data
→ current match state

OP.GG MCP / current meta data
→ current patch build/meta information

OpenAI
→ reason about the combination of current match + current meta

Overlay
→ show concise recommendations while TAB is held

The main idea is:

- Riot/League tells us what is happening in the current game.
- OP.GG tells us what is currently common/good in the meta.
- OpenAI compares the two and reasons about situational item choices.
- The user sees 3 reasonable options, not a single forced decision.

---

# IMPORTANT WORKING RULES

Work on this project ONE STEP AT A TIME.

Do NOT implement several major stages together.

For every numbered step:

1. Inspect the current project first.
2. Briefly explain what you are going to implement.
3. Implement ONLY the current step.
4. Run/build/test the code.
5. Fix errors before stopping.
6. Tell me:
   - What you implemented
   - Which files you created or changed
   - How I can test it
   - Any important limitations
   - What the next step will be
7. STOP.
8. Wait until I explicitly say:

"continue"

before starting the next numbered step.

Do not silently continue to another stage.

Prefer simple and readable code over unnecessary abstractions.

Use TypeScript whenever practical.

Keep the major systems separated:

- League data
- Static Riot data
- Meta data
- OpenAI
- Recommendation state
- Overlay UI

Do not hard-code API keys or secrets into source files.

Do not build a large hand-written League strategy engine.

Use TypeScript for both frontend and local backend/service code unless there is a strong technical reason not to.
---

# TARGET ARCHITECTURE

The final application should approximately work like this:

League of Legends
        ↓
Live Client Data API
        ↓
Current Game State
        ↓
        ├───────────────┐
        │               │
        ▼               ▼
Current Riot Data     OP.GG Meta Data
items/champions       builds/stats/meta
        │               │
        └───────┬───────┘
                ↓
             OpenAI
                ↓
      Structured Recommendation
                ↓
             Cache
                ↓
          React Overlay
                ↓
      Displayed while TAB held

Important:

Pressing TAB should NOT trigger a slow OpenAI request.

The recommendation should already be calculated and cached.

TAB only controls whether the overlay is visible.

---

# STEP 1 — Create the base project

Goal:

Create a clean development foundation.

Use:

- TypeScript
- React
- Node.js
- npm
- Vite or another simple modern React build setup

Create a sensible structure such as:

src/
  league/
  riot/
  meta/
  ai/
  recommendations/
  overlay/
  components/
  types/
  dev/

Create a basic page:

League Item Advisor

Add a simple placeholder UI.

Make sure:

npm install

npm run dev

npm run build

all work.

Add an appropriate .gitignore.

Do NOT add League integration yet.

Do NOT add OpenAI yet.

STOP after Step 1.

---

# STEP 2 — Read League Live Client Data

Goal:

Prove that we can read a real running League of Legends match.

Create a League Live Client module.

Use the local Live Client Data API.

Retrieve available game information such as:

- Game time
- Current player
- Champion
- Level
- Current items
- All players
- Allies
- Enemies
- Player scores
- Team information

Initially show the information in a development/debug screen.

The application must handle:

League not running

and

League running but not currently in a match

without crashing.

Display something simple such as:

Waiting for League game...

when no match is available.

Do not build recommendation logic.

STOP once live match data can successfully be read.

---

# STEP 3 — Create our internal GameState

Goal:

Separate Riot's raw API response from the rest of our application.

Create TypeScript models such as:

GameState

PlayerState

ItemState

TeamState

Example:

GameState:
- gameTime
- player
- allies
- enemies

PlayerState:
- championName
- level
- team
- items
- kills
- deaths
- assists

Convert Riot's raw response into our own clean GameState.

From this step onward, the rest of the application should preferably consume GameState rather than Riot's raw JSON.

Add some mock GameState examples for development.

STOP once the transformation works.

---

# STEP 4 — Add current Riot static data

Goal:

Resolve IDs and game objects to accurate current League information.

Use an appropriate official Riot static-data source such as Data Dragon where possible.

We should be able to retrieve and cache information such as:

Champion:
- Name
- ID
- Icon

Item:
- Name
- ID
- Icon
- Price
- Description
- Stats
- Build path where available

The system should automatically detect or use the appropriate current patch/version rather than hard-coding a patch number.

Example:

Live Client gives item ID

6653

Static-data layer resolves it into:

Liandry's Torment
icon
cost
description
stats

Cache static data locally/in memory so we do not repeatedly download the same files.

STOP once current Riot item/champion data works.

---

# STEP 5 — Build a development dashboard

Goal:

Before adding AI, create a page where we can clearly inspect everything the system knows.

Display:

MY CHAMPION

My level

My current items

My gold if available

Game time

ALLIES

Champion + items

ENEMIES

Champion + items

Also display relevant resolved item icons and names.

This debug dashboard is temporary but important for development.

We need to be able to verify that the AI later receives correct information.

Do NOT add recommendations yet.

STOP once the dashboard works with both mock data and a real match.

---

# STEP 6 — Integrate OP.GG current meta data

Goal:

Give the application access to current League meta information without manually maintaining builds.

Investigate and integrate the official/current OP.GG MCP capability suitable for League data.

Keep OP.GG integration inside a separate module.

Example:

src/meta/opgg.ts

The rest of the application should not depend directly on MCP-specific implementation details.

Create an interface such as:

MetaProvider

with operations approximately like:

getChampionMeta(champion, role)

getChampionBuilds(champion, role)

getRelevantItems(champion, role)

The exact interface can change based on the actual OP.GG MCP capabilities.

For the first test, use Brand mid.

We want to retrieve information such as:

- Common/current builds
- Frequently used items
- Situational items if available
- Champion statistics
- Role information
- Matchups if useful

Store the fetched result in a cache.

Do NOT query OP.GG repeatedly every few seconds.

Meta information can normally be fetched:

- At game start
- When champion/role changes
- When cache becomes stale

Create a development view that displays the OP.GG data we successfully retrieved.

If the OP.GG MCP API behaves differently from expected, inspect the actual available tools and adapt cleanly instead of inventing unsupported calls.

STOP once Brand meta data can successfully be retrieved and displayed.

---

# STEP 7 — Design the data sent to OpenAI

Goal:

Create a clean AI input format before actually calling OpenAI.

Build a function such as:

buildRecommendationContext()

It should combine:

1. Current GameState

2. Current Riot item information

3. Current OP.GG meta information

The result should be compact and structured.

Example concept:

{
  "player": {
    "champion": "Brand",
    "role": "MID",
    "level": 13,
    "gold": 2450,
    "items": [...]
  },

  "enemies": [
    {
      "champion": "Aatrox",
      "level": 14,
      "items": [...]
    }
  ],

  "meta": {
    "champion": "Brand",
    "role": "MID",
    "commonBuilds": [...],
    "commonItems": [...]
  }
}

Do not include unnecessary huge raw API responses.

Send enough current item information for the model to understand important item properties.

Create a development screen where the exact AI context can be inspected.

Do NOT call OpenAI yet.

STOP after the context builder works.

---

# STEP 8 — Define the AI recommendation contract

Goal:

Define exactly what OpenAI should return.

We do NOT want free-form paragraphs.

Create a strict structured recommendation model.

Example:

RecommendationResult:

{
  "champion": "Brand",
  "recommendedItems": [
    {
      "itemId": 3165,
      "itemName": "Morellonomicon",
      "priority": "VERY_HIGH",
      "reason": "Several enemies currently have significant healing."
    },
    {
      "itemId": ...,
      "itemName": "Blackfire Torch",
      "priority": "HIGH",
      "reason": "Stronger general damage option if anti-heal is already covered."
    },
    {
      "itemId": ...,
      "itemName": "Rylai's Crystal Scepter",
      "priority": "MEDIUM",
      "reason": "Adds utility against mobile enemies."
    }
  ],

  "summary": "Anti-heal is unusually valuable in this match."
}

The UI should normally display 3 options.

Keep reasons short enough to read while holding TAB.

The AI should understand:

OP.GG is the baseline/current meta.

The current match may justify deviating from that baseline.

The purpose of the application is specifically to identify those situational deviations.

The model should NOT blindly repeat the most popular OP.GG build.

The model should NOT pretend unknown information exists.

Do not call OpenAI yet.

STOP after the types/schema/prompt design is complete.

---

# STEP 9 — Integrate OpenAI

Goal:

Use OpenAI as the main recommendation reasoning layer.

Implement the OpenAI integration.

Keep it in a separate backend/local service layer.

Do NOT expose the OpenAI API key in frontend React code.

Use an environment variable or another appropriate secure local-development mechanism.

The model should receive the structured context from Step 7.

The prompt should instruct it to:

1. Treat current OP.GG data as a meta baseline.

2. Analyze the actual current enemy champions and items.

3. Consider the player's current items.

4. Determine whether this game justifies deviating from the standard build.

5. Return exactly 3 reasonable next-item options.

6. Give very short explanations.

7. Use structured output.

8. Avoid inventing items or mechanics not present in the supplied/current data.

Validate the model response against our RecommendationResult schema.

If the response is invalid:

- Handle it safely.
- Do not crash the overlay.

Display the result in the development dashboard.

STOP once a real OpenAI recommendation works.

---

# STEP 10 — Validate AI recommendations

Goal:

Make sure the model's answer is valid before displaying it.

This is NOT a strategy engine.

It is only an objective validation layer.

Check things such as:

- Does the recommended item exist?
- Is the item currently in the game?
- Is the item a purchasable relevant item?
- Does the player already own it?
- Did the model return exactly the expected structure?
- Can we resolve its icon and ID?

Do not assign hand-written strategic scores.

Do not implement logic like:

enemy healing = +30 Morellonomicon

The AI remains the main reasoning engine.

If a recommendation is invalid, either:

- reject it and retry appropriately

or

- fall back to a safe valid result

Log validation errors for development.

STOP once recommendation validation works.

---

# STEP 11 — Create recommendation caching and update triggers

Goal:

Make the system fast enough for an overlay.

IMPORTANT:

TAB must NOT trigger an OpenAI request.

Create a RecommendationStore / cache.

The application should keep the latest completed RecommendationResult.

Recalculate recommendations only when meaningful game state changes occur.

Examples:

- Player completes an item
- Enemy completes an item
- Important inventory state changes
- New meta context becomes available
- A configurable amount of time has passed if necessary

Do NOT call OpenAI:

- every frame
- every second
- every time TAB is pressed

Avoid recalculating because of meaningless changes such as tiny score changes unless they materially affect our analysis.

For the first version, a simple debounced inventory-change system is acceptable.

Display:

Recommendation updated: 18:32

in the debug screen.

STOP once caching/update logic works.

---

# STEP 12 — Build the overlay UI using mock data

Goal:

Create the real visual recommendation panel.

Do this first as a normal React component.

Do NOT integrate with the actual game overlay yet.

The target interaction is:

Hold TAB in League
→ League scoreboard opens
→ our panel appears on the RIGHT side

Release TAB
→ our panel disappears

Design requirements:

- Vertical panel
- Dark/semi-transparent
- Clean League-compatible look
- Easy to read in roughly 2–3 seconds
- Minimal text
- Strong visual hierarchy
- Actual item icons

Example layout:

┌─────────────────────────────┐
│ BRAND                       │
│ NEXT ITEM                   │
│                             │
│ [ICON] MORELLONOMICON       │
│        VERY HIGH            │
│                             │
│ High enemy healing          │
│                             │
│ Why:                        │
│ • Aatrox healing            │
│ • Nami healing              │
│ • Jinx: Bloodthirster       │
│                             │
│ ALTERNATIVES                │
│                             │
│ [ICON] Blackfire Torch      │
│ Higher general damage       │
│                             │
│ [ICON] Rylai's              │
│ More utility                │
└─────────────────────────────┘

Do not show giant AI paragraphs.

Use mock RecommendationResult data while designing.

Support at least:

1920x1080

2560x1440

Avoid unnecessarily hard-coding the whole UI to one resolution.

STOP when the component looks clean.

---

# STEP 13 — Add the actual game overlay

Goal:

Display the React recommendation panel over League of Legends.

Use Overwolf or another appropriate Riot-compatible overlay solution.

Requirements:

- Transparent overlay window
- Borderless
- Should not interfere with League controls
- Prefer click-through
- Normally hidden
- Designed to appear to the RIGHT side of the normal scoreboard

First create a simple development hotkey to toggle it.

Verify:

- Overlay appears correctly
- League continues receiving input
- Performance is acceptable

Do not implement TAB behavior until basic overlay rendering works.

STOP once the test overlay works in-game.

---

# STEP 14 — Implement hold-TAB behavior

Goal:

Create the intended final interaction.

While TAB is HELD:

- League should still receive TAB normally
- League scoreboard should open
- Our overlay should become visible
- Our latest cached recommendation should appear

When TAB is RELEASED:

- League scoreboard closes normally
- Our overlay disappears

TAB must pass through to League.

Our application must NOT simulate gameplay input.

TAB only controls overlay visibility.

Use the current cached recommendation.

No network request should happen simply because TAB was pressed.

Position the recommendation panel so it visually feels connected to the scoreboard, preferably on its right side.

Test multiple common resolutions.

STOP once this interaction works reliably.

---

# STEP 15 — Improve recommendation context

Goal:

Improve what the AI knows without building a manual strategy engine.

Potential additions:

- Current gold
- Item components
- Full item build paths
- Current game time
- Champion level
- Team composition
- Ally items
- Whether an ally already has anti-heal
- Current role
- Relevant OP.GG matchup information
- Current meta build alternatives

Add improvements incrementally.

Before adding each additional data source, ask:

Does this information actually help the model make a better item choice?

Avoid sending excessive irrelevant context.

Test recommendations against several mock scenarios.

Example Brand scenarios:

1. Heavy enemy healing

2. Heavy MR stacking

3. Several tanks/high-health enemies

4. Very squishy enemy team

5. Heavy dive/assassin composition

6. Anti-heal already covered by teammates

STOP after context quality is noticeably improved.

---

# STEP 16 — Improve OP.GG caching and patch awareness

Goal:

Make current-meta information reliable and efficient.

The application should know when its meta cache was created.

Store:

- Champion
- Role
- Patch/version if available
- Timestamp
- Source

Do not fetch OP.GG information repeatedly during one match unless necessary.

On a new patch or stale cache, refresh the data.

If OP.GG is unavailable:

The application should fail gracefully.

Possible behavior:

- Use the last cached meta data if still reasonably relevant.
- Clearly mark the source/cache as stale internally.
- Do not crash.

The system should still be able to read League even if OP.GG is temporarily unavailable.

STOP once caching/fallback behavior works.

---

# STEP 17 — Handle OpenAI failures gracefully

Goal:

The overlay should remain usable even if AI is temporarily unavailable.

Handle:

- Timeout
- Invalid API key
- Rate limiting
- Invalid structured response
- Network errors
- OpenAI service unavailable

Do NOT freeze the overlay.

Keep showing the most recent valid cached recommendation when appropriate.

Internally indicate:

Last successful analysis: timestamp

Do not spam retries.

STOP once error handling works.

---

# STEP 18 — Add settings

Create a settings screen.

Potential settings:

- Overlay scale
- Overlay position
- Hotkey
- Number of displayed recommendations
- Explanation detail
- Transparency
- OpenAI model
- AI enabled/disabled
- Debug mode
- OP.GG cache refresh behavior

Keep sensible defaults.

Do not overcomplicate settings in the first version.

STOP after basic settings work.

---

# STEP 19 — Test other champions

Goal:

Make sure the system is genuinely generic.

We should NOT need:

champions/brand.ts
champions/ahri.ts
champions/syndra.ts

with huge manually coded strategic rules.

Test several different champion types:

- AP mage
- AD carry
- Tank
- Assassin
- Support

The general architecture should remain:

Live game state
+
current meta
→
AI reasoning

Fix generalization problems rather than adding giant champion-specific rule files.

Small champion-specific configuration is acceptable only where truly necessary.

STOP once several champions work reasonably.

---

# STEP 20 — Polish and performance

Improve:

- Overlay rendering
- Animations
- Loading states
- React performance
- Polling frequency
- Memory usage
- API request frequency
- Resolution handling
- Game start/end detection
- Reconnecting between matches
- Logging

Make sure the application does not noticeably affect League FPS.

Do not add unnecessary visual complexity.

STOP once the app is stable for normal use.

---

# STEP 21 — Compliance and release review

Before public distribution:

Review current:

- Riot Games third-party application policies
- Riot API policies
- Riot overlay restrictions
- Overwolf requirements
- OP.GG MCP/data usage requirements
- OpenAI API requirements

Important design principle:

The application should present situational choices and reasoning rather than automate gameplay.

Example:

GOOD:

Morellonomicon
Very strong against the healing in this match

Blackfire Torch
Higher general damage

Rylai's
More utility

AVOID:

BUY MORELLONOMICON NOW

The application must never:

- Automatically purchase items
- Send gameplay inputs
- Control the champion
- Automate combat/gameplay decisions

Create a release-readiness report.

Do NOT publish or submit the app automatically.

STOP.

---

# DEVELOPMENT PRIORITY

Do not spend too much time polishing the UI before the full data pipeline works.

Our first major milestones are:

MILESTONE 1

Read a real League match.

MILESTONE 2

Retrieve current Brand meta data from OP.GG.

MILESTONE 3

Combine current match + current meta into an OpenAI request.

MILESTONE 4

Receive 3 valid situational item recommendations.

MILESTONE 5

Display those recommendations instantly from cache.

MILESTONE 6

Show the panel while TAB is held.

---

# MOST IMPORTANT DESIGN PRINCIPLE

Do NOT build a giant manually maintained League recommendation system.

The application's code is responsible for:

- Collecting accurate data
- Keeping data current
- Structuring context
- Calling the model
- Validating output
- Caching results
- Displaying recommendations

OpenAI is responsible for:

- Understanding the current situation
- Comparing it with current meta information
- Identifying relevant deviations from standard builds
- Explaining the tradeoffs between item choices

OP.GG/current meta data is the baseline.

The live match is the specific situation.

The AI combines the two.

---

Start with STEP 1 ONLY.

After completing Step 1, STOP and wait for me to say:

continue