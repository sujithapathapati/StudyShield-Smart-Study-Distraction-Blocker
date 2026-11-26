# StudyShield backend (Spring Boot 3 + MongoDB)

## Run locally
1. Install Java 17+ and Maven, and start MongoDB (local install, or a free MongoDB Atlas cluster).
2. `cd backend`
3. `MONGODB_URI="mongodb://localhost:27017/studyshield" JWT_SECRET="any-random-string-at-least-32-characters" mvn spring-boot:run`
4. The API runs at http://localhost:8081. Check http://localhost:8081/api/health

In the StudyShield website, open **Connect backend** (or Settings) and enter the server address.

> The Lovable preview runs over HTTPS. Browsers usually let HTTPS pages call `http://localhost`, but for your demo it's safest to deploy:

## Deploy (Render / Railway)
- Build: `mvn -DskipTests package`. Start: `java -jar target/studyshield-backend-1.0.0.jar`
- Env vars: `MONGODB_URI` (Atlas connection string), `JWT_SECRET`, `CORS_ORIGINS` (your website URL)

## Tests
`mvn test` checks the break rules (under 30 min: 0, 30–59: 1, 60–119: 2, 120+: 3).

## API
| Method | Path | Purpose |
|---|---|---|
| POST | /api/auth/signup, /api/auth/login | Returns `{token, user}` (JWT, BCrypt passwords) |
| GET | /api/auth/me | Current user |
| GET/POST | /api/goals | List / create |
| PUT/DELETE | /api/goals/{id} | Edit / delete |
| PATCH | /api/goals/{id}/complete | `{completed: bool}` |
| GET | /api/sessions/active | Running session or null |
| POST | /api/sessions/start | `{goalId}`; rejects a second open session |
| POST | /api/sessions/{id}/pause, resume, break/start, break/end, cancel | Timer controls |
| POST | /api/sessions/{id}/complete | `{markGoalComplete}`; only completes that session's goal |
| GET | /api/stats/summary?tzOffset= | Dashboard stats |
