# Project Handoff: CK Coaching App

## 1. Project Overview
- **App Name:** CK Coaching (Premium Fitness Coaching Platform)
- **Tech Stack:** Next.js 14/15 (App Router, Client Components mostly), Tailwind CSS, Supabase (PostgreSQL + Auth), Lucide React, SWR (for caching).
- **Core Concept:** A luxury, mobile-first web app for high-end fitness coaching. Clients get 12-week highly personalized tracking and workout blocks.

## 2. Current State & Recent Work
**Phase 4 (Gamification & Daily Tracking) - COMPLETED:**
- Developed a 3-Level Habit Tracking system (L1: Weight, L2: Steps, L3: Macros).
- Created premium UI for "Perfect Workouts" (Gold foil metallic effects, glowing borders).
- Re-architected iOS Safe Area scrolling by using Floating Bottom Buttons (`absolute bottom-0`) overlaid on a deeply padded scrollable container (`pb-[120px]`).

**Phase 5 (Performance Optimization / V5) - COMPLETED:**
- Replaced all rotating loading spinners with modern, pulsing Skeleton UIs across the Client App.
- Implemented **SWR (Stale-While-Revalidate)** for the Client Dashboard (`/`), Program (`/program`), and Profile (`/profile`) tabs.
- Achieved **0-second (Instant Load)** perceived load times when navigating between main tabs via caching.
- Fixed complex date math bugs (e.g., jumping to negative weeks if `coaching_start_date` is in the future).

## 3. Strict Rules & Conventions (CRITICAL)
- **Terminology:** NEVER use the word "HLV". ALWAYS use "Coach".
- **Agent Workflow:** ALWAYS discuss architectural plans or UI mockups with the user first. DO NOT write or push code without explicit user approval of the plan.
- **Client App Container:** All client-facing pages MUST use the exact wrapper: `<div className="max-w-md mx-auto min-h-screen bg-brand-paper shadow-2xl relative pb-24">`. This ensures the app looks like a floating mobile card on desktop monitors.
- **Floating Bottom Buttons:** For sticky bottom actions (like "Submit"), do NOT use thick white background panels. Instead, make them float transparently (`absolute bottom-0 pb-[max(env(safe-area-inset-bottom),32px)]`) over the content, and give the main container `pb-[120px]` so text scrolls smoothly underneath without clipping.
- **Lucide Icons:** When filling a Lucide React icon (like `CheckCircle2`), Tailwind `fill-` classes often fail. Pass the color string directly: `<CheckCircle2 fill="#FCE3A1" />`.
- **SWR Caching:** The Client App uses SWR. If you update database tables, make sure to call SWR's `mutate()` to instantly update the UI.

## 4. Next Steps for Next Session
- Wait for the user's direction on the next feature. We have successfully completed the core Gamification (Phase 4) and Performance Caching (Phase 5).
- If moving to Server-Side Rendering (SSR) for the initial load, we will need to migrate Supabase Auth from `localStorage` to Cookies via Middleware, which is a major architectural shift.
