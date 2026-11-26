# StudyShield — Smart Study Distraction Blocker

**Plan • Focus • Track** — A full-stack student productivity platform that combines structured goal planning, smart focus sessions, AI study assistance, and real-time Chrome browser distraction blocking.

**Author:** Pathapati Sujitha

---

## Overview

Conventional study timers only count down minutes—they do not prevent students from opening distracting websites. **StudyShield** solves this by unifying goal management, timed focus sessions, AI-powered study planning, and a Manifest V3 Chrome extension into a single connected system that actively blocks distracting domains in Chrome while a focus session is active.

---

## System Architecture

StudyShield is built on a **4-tier full-stack architecture**:

1. **Frontend (`studyshield-website`)** — React.js, TypeScript, TanStack Router, and Tailwind CSS (`http://localhost:8080`)
2. **Backend (`studyshield-backend`)** — Java 17+, Spring Boot 3.3.4 REST APIs, Spring Security, and Stateless JWT Authentication (`http://localhost:8081`)
3. **Database** — MongoDB Atlas Cloud (`Users`, `Goals`, `StudySessions`, `BlockedSites`, `AiPlans`, `AiConversations`, `UserSettings`)
4. **Browser Enforcement & AI Layer**:
   - **Chrome Extension (`studyshield-chrome-extension`)**: Manifest V3 extension (`sync.js` + `background.js`) that syncs JWT tokens from the web app, polls `GET /api/extension/state` every 2 seconds, and dynamically updates `chrome.declarativeNetRequest` rules during active focus sessions.
   - **AI Study Assistant**: Google Gemini API (`gemini-flash-lite-latest`, `gemini-3.5-flash-lite`, `gemini-3-flash-preview`) with multi-model fallback and timeout handling for AI Study Chat and structured study plan generation.

---

## Key Features

- **Goal & Task Planner**: Create, prioritize (`LOW`, `MEDIUM`, `HIGH`), schedule, and track completion of study goals.
- **Focus Sessions & Smart Break Policy**: Start, pause, resume, and complete timed study sessions with rule-based break limits (`< 30 min`: 0 breaks, `30–59 min`: 1 break, `60–119 min`: 2 breaks, `>= 120 min`: 3 breaks).
- **Real-Time Browser Distraction Blocking**: Add or toggle any domain on the web app; Chrome immediately redirects blocked tabs (including already-open tabs) to a **"Stay Focused"** screen displaying the active goal until the session ends.
- **AI Study Chat & AI Planner**: Interactive study assistant and automated topic breakdown into actionable study goals powered by Google Gemini.
- **Productivity Analytics**: Daily and weekly focus minutes, completed sessions, streaks, goal completion rate, and Focus Score.

---

## Project Structure

```text
StudyShield/
├── studyshield-backend/backend/                   # Spring Boot 3 REST API, JWT Security, MongoDB & Gemini AI
├── studyshield-website/studyshield-website/         # React + TypeScript + TanStack Router Frontend
├── studyshield-chrome-extension/chrome-extension/ # Manifest V3 Real-Time Chrome Site Blocker
└── README.md
