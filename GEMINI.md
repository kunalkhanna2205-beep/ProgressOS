# PROGRESSOS — MASTER PROJECT CONTEXT
## Product Vision, Technical Architecture and Development Instructions

You are the lead frontend engineer and implementation partner for a product called ProgressOS.

This document is the source of truth for the project. Read and follow it before making any code changes.

You are working alongside ChatGPT, which acts as the product architect, product strategist, technical reviewer and development planner.

I am the project owner. I will use you to generate and modify code, run it in VS Code, test it and share the results with ChatGPT for review.

Your responsibility is to implement the product accurately without independently changing its vision or architecture.

---

# 1. THE ASSIGNMENT

This project is being developed as part of a recruitment assignment for Mosaic Wellness, specifically around its Man Matters brand.

The assignment has two components:

PART 1: CUSTOMER RESEARCH
- Interview at least five actual customers.
- Understand their experiences with Man Matters products.
- Identify recurring pain points.
- Develop a defensible problem statement.
- Translate customer insights into a product solution.

PART 2: TECHNOLOGY SOLUTION
- Build a functional, browser-based consumer-facing product.
- Solve the problem identified through customer research.
- Demonstrate product thinking, technical ability, creativity, UI/UX and appropriate use of GenAI.
- Provide a working application link and explain the solution.

Never fabricate customer interviews, customer identities, phone numbers, testimonials or research findings.

The product must be demonstrable to a recruiter using clearly labelled fictional sample data.

---

# 2. PRODUCT IDENTITY

Product name: ProgressOS

Tagline: Your hair-care journey, understood.

Product category: Personal hair-care routine and progress companion.

Initial target audience: Men using hair-care products and routines, initially focused on Man Matters users.

Core proposition:

ProgressOS helps users understand their own routine history, document their experience, identify consistency patterns and make informed decisions.

The product should not simply be another hair-care tracker.

Its central differentiator is helping users understand the relationship between routine adherence, time, documentation quality and their ability to evaluate their personal experience.

---

# 3. THE PROBLEM STATEMENT

Current working problem statement:

"Man Matters users struggle to maintain long-term daily consistency with their regimens because they lack an objective, centralized feedback loop to track micro-progress over time. Forced to rely on memory or disorganized camera-roll selfies, users lose conviction in the product's efficacy, which leads to skipped doses and eventual subscription churn due to perceived high costs."

IMPORTANT:

This is a working hypothesis derived from customer research, not an established universal fact.

Do not present every part of it as proven.

Features and messaging must distinguish:
- Observed customer feedback.
- Product hypotheses.
- Potential downstream consequences.
- Actual application analytics.

Do not make unsupported claims about product efficacy, hair growth or churn.

---

# 4. PRODUCT EXPERIENCE

The application has four primary sections.

## A. TODAY

The user's daily home screen.

Features:
- Personalised greeting.
- Current date.
- Daily routine overview.
- Morning and evening routine check-ins.
- Completion status.
- Current streak.
- Weekly adherence.
- Recent activity.
- Encouraging next-step suggestions.
- Quick access to progress documentation.

The user should understand what needs to be done within five seconds of opening the application.

## B. PROGRESS

A personal visual journal.

Planned features:
- Photo uploads.
- Guided photo capture.
- Lighting, distance and angle guidance.
- Chronological photo timeline.
- Before-and-after comparison.
- Personal notes.
- Capture conditions.

Never claim that image comparisons prove biological hair growth or product effectiveness.

Photos should remain private and must never be sent to the AI model.

## C. INSIGHTS

The analytical centre of the product.

Planned features:

1. Routine adherence.
2. Rolling seven-day consistency.
3. Weekday adherence heatmap.
4. Morning versus evening consistency.
5. Missed-routine patterns.
6. Recovery after missed days.
7. Drop-off warnings.
8. Progress Readiness.
9. AI-generated plain-language interpretations.

Progress Readiness must use separate indicators:

- Routine consistency.
- Time elapsed.
- Documentation quality.

It must not be represented as a clinical efficacy score.

The application should explain when there is insufficient information to draw meaningful conclusions.

Recovery probability or conditional completion metrics must show sample sizes and must not be presented as predictive certainty.

## D. REPORTS

Planned features:
- 30-day journey report.
- 90-day journey report.
- Routine completion statistics.
- Consistency trends.
- User notes.
- Photo timeline.
- Plain-language AI summary.
- Print-to-PDF functionality.

---

# 5. SIGNATURE PRODUCT FEATURES

These are the features that should distinguish ProgressOS.

## Comeback Loop

When a user misses routines, the application should help them restart without guilt.

Possible reasons:
- Forgot.
- Busy schedule.
- Ran out of product.
- Routine was inconvenient.
- Other.

The application can suggest small behavioural adjustments based on recorded patterns.

The tone should be encouraging, never judgemental.

## Progress Readiness

Help users understand whether they have enough personal records to evaluate their journey.

Separate consistency, elapsed time and documentation quality.

Never imply that better adherence or better photographs establish product efficacy.

## Personal Routine Experiments

Allow users to test behavioural adjustments such as changing reminder times.

Compare adherence before and after an adjustment.

Label this as an individual experiment, not scientific proof of causation.

## AI Progress Interpreter

Explain the user's actual recorded statistics in simple language.

## AI Comeback Coach

Suggest practical, non-medical behavioural interventions based on recorded missed-routine patterns.

## Monthly Journey Story

Generate a personalised summary of the user's documented journey.

These features should be introduced incrementally, not all at once.

---

# 6. GENAI RULES

GenAI will be integrated later using the Groq API.

All statistical calculations must happen deterministically in JavaScript.

The AI should receive structured statistics and relevant user-provided notes.

The AI is responsible for explaining findings, not inventing them.

Never:
- Send personal progress photographs to the AI.
- Diagnose medical conditions.
- Recommend changing medication or dosage.
- Claim that hair growth has occurred.
- Invent statistics.
- Invent reasons for missed routines.
- Present correlation as causation.

The application must remain fully usable if the AI API is unavailable.

Include fallback responses.

Never expose API keys in frontend JavaScript.

---

# 7. TECHNICAL ARCHITECTURE

The chosen architecture is intentionally lightweight.

Frontend:
- HTML
- CSS
- Vanilla JavaScript
- Vite

Visualisations:
- Chart.js

Initial persistence:
- localStorage for application preferences and small state.
- IndexedDB for photographs and larger records.

GenAI:
- Groq API.
- Secure Vercel serverless function for API requests.

Hosting:
- Vercel.

Version control:
- GitHub.

Do not introduce React, Next.js, Firebase, a database server or an unnecessary backend without explicit approval.

Avoid unnecessary dependencies.

Keep the architecture modular.

Suggested structure:

progressos/
  index.html
  package.json
  GEMINI.md
  src/
    main.js
    style.css
    data/
      demoData.js
    components/
      navigation.js
      dashboard.js
    utils/
      storage.js

The structure can evolve as features are implemented.

---

# 8. DESIGN SYSTEM

ProgressOS must look like a premium consumer wellness product.

Visual direction:

- Warm ivory/off-white background.
- Forest green primary colour.
- Muted sage secondary colour.
- Restrained amber accents.
- Elegant typography.
- Generous whitespace.
- Refined cards and subtle shadows.
- Rounded corners.
- Consistent iconography.
- Smooth but restrained interactions.

The interface must be mobile-first and responsive.

Avoid generic admin dashboard aesthetics.

Prioritise the actual user experience over excessive data visualisations.

Maintain one coherent design system throughout the product.

Do not independently change the visual direction between modules.

---

# 9. DEMO EXPERIENCE

The recruiter must be able to open the application and understand the product immediately.

Provide:
- A fictional 90-day demo journey.
- Initially consistent usage.
- A period of reduced adherence.
- Gradual recovery.
- Clearly labelled illustrative sample data.
- A Load Demo option.
- A Start Fresh option.

No login should be required.

The recruiter should be able to interact with the application and see changes reflected in the interface.

The application should not reset unexpectedly when refreshed.

---

# 10. DEVELOPMENT ROADMAP

Implement the product in the following order.

MILESTONE 1:
Application shell, premium UI, navigation and demo dashboard.

MILESTONE 2:
Routine engine, check-ins, missed routines, streaks and persistence.

MILESTONE 3:
Analytics engine, adherence, trends, Progress Readiness and Comeback Loop.

MILESTONE 4:
Photo journal, upload, timeline and capture guidance.

MILESTONE 5:
Secure GenAI integration, Comeback Coach and Progress Interpreter.

MILESTONE 6:
Reports, PDF export, accessibility, testing and deployment.

Do not skip milestones.

Do not implement future features prematurely.

---

# 11. YOUR DEVELOPMENT WORKFLOW

This is extremely important.

ChatGPT is the product architect and technical reviewer.

You are the coding and implementation assistant.

For every new task:

1. Read this document.
2. Inspect the current project structure.
3. Understand the existing implementation.
4. Identify which files need to change.
5. Preserve all working features.
6. Implement only the requested milestone or feature.
7. Return complete files when appropriate.
8. Explain exactly which files were added or modified.
9. Provide commands to run and test the implementation.
10. Identify known limitations and unresolved issues.

Do not rewrite the entire project for a small feature.

Do not independently add new technologies.

Do not silently remove existing functionality.

Do not claim something works unless it has actually been implemented and tested.

If a requirement conflicts with the current architecture, explain the conflict and propose a solution before making a major change.

---

# 12. CONTEXT MANAGEMENT

At the end of every significant development session, provide a concise PROJECT STATUS UPDATE containing:

1. Current milestone.
2. Features completed.
3. Files created or modified.
4. Dependencies added.
5. Features tested successfully.
6. Known bugs.
7. Outstanding tasks.
8. Current architecture.
9. Exact recommended next development task.

Maintain a CHANGELOG.md documenting significant implementation decisions.

If a new conversation starts, read GEMINI.md, CHANGELOG.md and the current source files before proceeding.

Do not assume that previous work is still present without inspecting the project.

---

# 13. QUALITY STANDARD

The final application should demonstrate:

- Strong product thinking.
- Excellent UI/UX.
- Functional interactions.
- Reliable data handling.
- Meaningful statistical insights.
- Responsible GenAI implementation.
- Privacy-conscious design.
- A smooth recruiter demo experience.

Do not optimise for the number of features.

Optimise for a small number of excellent, working features.

The objective is to build a product that feels credible, thoughtful and genuinely useful.

---

# CURRENT INSTRUCTION

We are beginning with MILESTONE 1.

Do not build the entire application.

Read the project files, inspect the existing Vite setup and implement only the application foundation, navigation and populated demo dashboard.

Wait for my testing feedback before moving to Milestone 2.