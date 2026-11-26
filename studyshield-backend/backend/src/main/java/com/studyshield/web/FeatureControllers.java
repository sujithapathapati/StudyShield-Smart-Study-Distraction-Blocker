package com.studyshield.web;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.studyshield.model.Models.*;
import com.studyshield.repo.Repos.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.*;
import java.util.*;

@RestController
@RequestMapping("/api")
public class FeatureControllers {

    private final BlockedSiteRepo blocks;
    private final UserSettingsRepo settingsRepo;
    private final AiPlanRepo plans;
    private final AiConversationRepo convos;
    private final GoalRepo goals;
    private final SessionRepo sessions;
    private final UserRepo users;
    private final ObjectMapper mapper = new ObjectMapper();
    private final HttpClient http = HttpClient.newHttpClient();

    @Value("${studyshield.gemini.api-key:}")
    private String geminiApiKey;

    public FeatureControllers(BlockedSiteRepo blocks, UserSettingsRepo settingsRepo,
                              AiPlanRepo plans, AiConversationRepo convos,
                              GoalRepo goals, SessionRepo sessions, UserRepo users) {
        this.blocks = blocks;
        this.settingsRepo = settingsRepo;
        this.plans = plans;
        this.convos = convos;
        this.goals = goals;
        this.sessions = sessions;
        this.users = users;
    }

    // ==================== 1. BLOCKED WEBSITES & EXTENSION SYNC ====================
    @GetMapping("/blocks")
    public List<BlockedSite> listBlocks(@AuthenticationPrincipal String uid) {
        List<BlockedSite> list = blocks.findByUserIdOrderByCreatedAtDesc(uid);
        if (list.isEmpty()) {
            List<String[]> defaults = List.of(
                new String[]{"Instagram", "instagram.com"},
                new String[]{"Facebook", "facebook.com"},
                new String[]{"X / Twitter", "x.com"},
                new String[]{"Reddit", "reddit.com"},
                new String[]{"TikTok", "tiktok.com"},
                new String[]{"YouTube Shorts", "youtube.com"}
            );
            for (String[] d : defaults) {
                BlockedSite b = new BlockedSite();
                b.userId = uid; b.name = d[0]; b.domain = d[1]; b.enabled = !d[1].equals("youtube.com");
                blocks.save(b);
            }
            list = blocks.findByUserIdOrderByCreatedAtDesc(uid);
        }
        return list;
    }

    @PostMapping("/blocks")
    public BlockedSite addBlock(@AuthenticationPrincipal String uid, @RequestBody Map<String, String> body) {
        String raw = body.getOrDefault("domain", "").trim().toLowerCase()
                .replaceAll("^https?://", "").replaceAll("^www\\.", "").replaceAll("/.*$", "");
        if (raw.isEmpty() || !raw.contains(".")) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Enter a valid domain like instagram.com");
        }
        if (blocks.existsByUserIdAndDomain(uid, raw)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Domain already in block list");
        }
        BlockedSite b = new BlockedSite();
        b.userId = uid;
        b.domain = raw;
        b.name = body.getOrDefault("name", "").isBlank() ? raw : body.get("name").trim();
        b.enabled = true;
        return blocks.save(b);
    }

    @PatchMapping("/blocks/{id}/toggle")
    public BlockedSite toggleBlock(@AuthenticationPrincipal String uid, @PathVariable String id) {
        BlockedSite b = blocks.findByIdAndUserId(id, uid)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        b.enabled = !b.enabled;
        return blocks.save(b);
    }

    @DeleteMapping("/blocks/{id}")
    public Map<String, Boolean> deleteBlock(@AuthenticationPrincipal String uid, @PathVariable String id) {
        BlockedSite b = blocks.findByIdAndUserId(id, uid)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        blocks.delete(b);
        return Map.of("deleted", true);
    }

    @GetMapping("/extension/state")
    public Map<String, Object> extensionState(@AuthenticationPrincipal String uid) {
        Optional<StudySession> active = sessions.findFirstByUserIdAndStatusIn(
                uid, List.of(SessionStatus.ACTIVE, SessionStatus.PAUSED, SessionStatus.BREAK));
        boolean focusOn = active.isPresent() && active.get().status == SessionStatus.ACTIVE;
        List<String> enabledDomains = blocks.findByUserIdOrderByCreatedAtDesc(uid).stream()
                .filter(b -> b.enabled).map(b -> b.domain).toList();
        UserSettings cfg = settingsRepo.findById(uid).orElseGet(UserSettings::new);
        return Map.of(
                "focusOn", focusOn,
                "goalTitle", active.map(s -> s.goalTitle).orElse(""),
                "sites", enabledDomains,
                "smartYoutube", cfg.smartYoutubeEnabled
        );
    }

    // ==================== 2. SETTINGS & PROFILE ====================
    @GetMapping("/settings")
    public UserSettings getSettings(@AuthenticationPrincipal String uid) {
        return settingsRepo.findById(uid).orElseGet(() -> {
            UserSettings s = new UserSettings();
            s.userId = uid;
            return settingsRepo.save(s);
        });
    }

    @PutMapping("/settings")
    public UserSettings updateSettings(@AuthenticationPrincipal String uid, @RequestBody UserSettings req) {
        req.userId = uid;
        return settingsRepo.save(req);
    }

    @PatchMapping("/profile")
    public Map<String, Object> updateProfile(@AuthenticationPrincipal String uid, @RequestBody Map<String, String> body) {
        User u = users.findById(uid).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        if (body.containsKey("fullName") && !body.get("fullName").isBlank()) {
            u.fullName = body.get("fullName").trim();
            users.save(u);
        }
        return Map.of("id", u.id, "fullName", u.fullName, "email", u.email);
    }

    // ==================== 3. AI STUDY PLANNER ====================
    @GetMapping("/ai/plans")
    public List<AiPlan> listPlans(@AuthenticationPrincipal String uid) {
        return plans.findByUserIdOrderByCreatedAtDesc(uid);
    }

    @PostMapping("/ai/plans/generate")
    public AiPlan generatePlan(@AuthenticationPrincipal String uid, @RequestBody Map<String, Object> body) {
        String subject = String.valueOf(body.getOrDefault("subject", "General Study")).trim();
        String targetDate = String.valueOf(body.getOrDefault("targetDate", LocalDate.now().plusDays(7))).trim();
        int minutesPerDay = Integer.parseInt(String.valueOf(body.getOrDefault("minutesPerDay", 60)));
        String level = String.valueOf(body.getOrDefault("level", "Intermediate"));
        String weakAreas = String.valueOf(body.getOrDefault("weakAreas", ""));

        String prompt = """
            You are StudyShield AI Academic Planner. Create a realistic structured study plan.
            Subject: %s
            Target Exam Date: %s
            Daily Available Minutes: %d
            Current Level: %s
            Weak Areas / Notes: %s

            Respond ONLY with valid raw JSON (no markdown fences) matching this exact schema:
            {
              "title": "Short motivating plan title",
              "summary": "2 sentence strategy summary",
              "items": [
                {
                  "dayLabel": "Day 1",
                  "title": "Actionable study task title",
                  "description": "Specific subtopics and practice method",
                  "durationMinutes": 30,
                  "priority": "HIGH"
                }
              ]
            }
            Generate 5 to 7 concrete tasks. Priority must be LOW, MEDIUM, or HIGH.
            """.formatted(subject, targetDate, minutesPerDay, level, weakAreas);

        AiPlan plan = new AiPlan();
        plan.userId = uid;
        plan.subject = subject;
        plan.targetDate = targetDate;

        try {
            String rawJson = callGemini(prompt, true);
            JsonNode root = mapper.readTree(rawJson);
            plan.title = root.path("title").asText(subject + " Mastery Plan");
            plan.summary = root.path("summary").asText("Structured daily study blocks tailored to your schedule.");
            for (JsonNode n : root.path("items")) {
                PlanTaskItem item = new PlanTaskItem();
                item.id = UUID.randomUUID().toString();
                item.dayLabel = n.path("dayLabel").asText("Day 1");
                item.title = n.path("title").asText("Study Session");
                item.description = n.path("description").asText("");
                item.durationMinutes = Math.max(10, Math.min(180, n.path("durationMinutes").asInt(30)));
                String p = n.path("priority").asText("MEDIUM").toUpperCase();
                item.priority = List.of("LOW", "MEDIUM", "HIGH").contains(p) ? Priority.valueOf(p) : Priority.MEDIUM;
                plan.items.add(item);
            }
        } catch (Exception ex) {
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY,
                    "AI service error: " + ex.getMessage() + ". Check studyshield.gemini.api-key in application.properties.");
        }
        return plans.save(plan);
    }

    @PostMapping("/ai/plans/{planId}/items/{itemId}/convert")
    public Goal convertPlanItemToGoal(@AuthenticationPrincipal String uid,
                                      @PathVariable String planId,
                                      @PathVariable String itemId) {
        AiPlan plan = plans.findByIdAndUserId(planId, uid)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        PlanTaskItem item = plan.items.stream().filter(i -> i.id.equals(itemId)).findFirst()
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));

        Goal g = new Goal();
        g.userId = uid;
        g.title = item.title;
        g.description = item.description;
        g.durationMinutes = item.durationMinutes;
        g.priority = item.priority;
        g.source = "AI_PLANNER";
        Goal saved = goals.save(g);

        item.convertedToGoal = true;
        plans.save(plan);
        return saved;
    }

    @PatchMapping("/ai/plans/{planId}/items/{itemId}/toggle")
    public AiPlan togglePlanItem(@AuthenticationPrincipal String uid,
                                 @PathVariable String planId,
                                 @PathVariable String itemId) {
        AiPlan plan = plans.findByIdAndUserId(planId, uid)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        plan.items.stream().filter(i -> i.id.equals(itemId)).findFirst().ifPresent(i -> i.completed = !i.completed);
        return plans.save(plan);
    }

    @DeleteMapping("/ai/plans/{planId}")
    public Map<String, Boolean> deletePlan(@AuthenticationPrincipal String uid, @PathVariable String planId) {
        AiPlan plan = plans.findByIdAndUserId(planId, uid)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        plans.delete(plan);
        return Map.of("deleted", true);
    }

    // ==================== 4. AI STUDY CHAT ====================
    @GetMapping("/ai/conversations")
    public List<AiConversation> listConversations(@AuthenticationPrincipal String uid) {
        return convos.findByUserIdOrderByUpdatedAtDesc(uid);
    }

    @PostMapping("/ai/chat")
    public AiConversation sendChatMessage(@AuthenticationPrincipal String uid, @RequestBody Map<String, String> body) {
        String message = body.getOrDefault("message", "").trim();
        if (message.isEmpty()) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Message cannot be empty");
        String convoId = body.get("conversationId");

        AiConversation convo = (convoId != null && !convoId.isBlank())
                ? convos.findByIdAndUserId(convoId, uid).orElseGet(AiConversation::new)
                : new AiConversation();
        if (convo.id == null) {
            convo.userId = uid;
            convo.title = message.length() > 42 ? message.substring(0, 42) + "..." : message;
        }

        ChatMessageItem userMsg = new ChatMessageItem();
        userMsg.role = "user";
        userMsg.content = message;
        convo.messages.add(userMsg);

        List<Goal> userGoals = goals.findByUserIdOrderByCreatedAtDesc(uid);
        String goalSummary = userGoals.stream().limit(6)
                .map(g -> "- " + g.title + " (" + g.durationMinutes + "m, " + (g.completed ? "Done" : "Pending") + ")")
                .reduce("", (a, b) -> a + "\n" + b);

        StringBuilder prompt = new StringBuilder();
        prompt.append("You are StudyShield AI Assistant, a supportive academic coach. ")
              .append("Keep answers clear, structured, and actionable. ")
              .append("Student's current goals:").append(goalSummary.isEmpty() ? " None yet." : goalSummary)
              .append("\n\nConversation:\n");
        int start = Math.max(0, convo.messages.size() - 8);
        for (int i = start; i < convo.messages.size(); i++) {
            ChatMessageItem m = convo.messages.get(i);
            prompt.append(m.role.equals("user") ? "Student: " : "Assistant: ").append(m.content).append("\n");
        }

        try {
            String reply = callGemini(prompt.toString(), false);
            ChatMessageItem aiMsg = new ChatMessageItem();
            aiMsg.role = "assistant";
            aiMsg.content = reply;
            convo.messages.add(aiMsg);
            convo.updatedAt = Instant.now();
            return convos.save(convo);
        } catch (Exception ex) {
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "AI Chat error: " + ex.getMessage());
        }
    }

    @DeleteMapping("/ai/conversations/{id}")
    public Map<String, Boolean> deleteConversation(@AuthenticationPrincipal String uid, @PathVariable String id) {
        AiConversation c = convos.findByIdAndUserId(id, uid)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        convos.delete(c);
        return Map.of("deleted", true);
    }

    // ==================== 5. ANALYTICS & ACHIEVEMENTS ====================
    @GetMapping("/analytics/full")
    public Map<String, Object> fullAnalytics(@AuthenticationPrincipal String uid,
                                             @RequestParam(defaultValue = "0") int tzOffset) {
        ZoneOffset zone = ZoneOffset.ofTotalSeconds(-tzOffset * 60);
        LocalDate today = LocalDate.now(zone);
        List<StudySession> done = sessions.findByUserIdAndStatusAndEndedAtAfter(
                uid, SessionStatus.COMPLETED, today.minusDays(90).atStartOfDay(zone).toInstant());
        List<Goal> allGoals = goals.findByUserIdOrderByCreatedAtDesc(uid);
        List<AiPlan> allPlans = plans.findByUserIdOrderByCreatedAtDesc(uid);

        long totalFocusMinutes = done.stream().mapToLong(s -> s.accumulatedFocusMs / 60_000).sum();
        long longestMinutes = done.stream().mapToLong(s -> s.accumulatedFocusMs / 60_000).max().orElse(0);
        long completedGoals = allGoals.stream().filter(g -> g.completed).count();

        Map<String, Long> byGoal = new LinkedHashMap<>();
        for (StudySession s : done) {
            byGoal.merge(s.goalTitle != null ? s.goalTitle : "Focus", s.accumulatedFocusMs / 60_000, Long::sum);
        }

        var achievements = List.of(
                badge("first_session", "First Focus Session", "Complete your first focus session", done.size(), 1),
                badge("five_sessions", "Consistent Scholar", "Complete 5 focus sessions", done.size(), 5),
                badge("one_hour", "One Hour Milestone", "Accumulate 60 minutes of deep focus", (int) totalFocusMinutes, 60),
                badge("five_hours", "Deep Work Master", "Accumulate 300 minutes of deep focus", (int) totalFocusMinutes, 300),
                badge("goals_five", "Goal Crusher", "Complete 5 study goals", (int) completedGoals, 5),
                badge("ai_plan", "AI Strategist", "Generate an AI Study Plan", allPlans.size(), 1)
        );

        Map<String, Object> res = new LinkedHashMap<>();
        res.put("totalFocusMinutes", totalFocusMinutes);
        res.put("longestSessionMinutes", longestMinutes);
        res.put("totalSessions", done.size());
        res.put("avgSessionMinutes", done.isEmpty() ? 0 : totalFocusMinutes / done.size());
        res.put("goalsTotal", allGoals.size());
        res.put("goalsCompleted", completedGoals);
        res.put("aiPlansCount", allPlans.size());
        res.put("byGoal", byGoal.entrySet().stream()
                .map(e -> Map.of("name", e.getKey(), "minutes", e.getValue())).toList());
        res.put("achievements", achievements);
        return res;
    }

    private Map<String, Object> badge(String id, String title, String desc, int current, int target) {
        return Map.of(
                "id", id,
                "title", title,
                "description", desc,
                "current", Math.min(current, target),
                "target", target,
                "unlocked", current >= target
        );
    }

    private String callGemini(String prompt, boolean jsonMode) throws Exception {
        if (geminiApiKey == null || geminiApiKey.isBlank() || geminiApiKey.startsWith("YOUR_")) {
            throw new IllegalStateException("Gemini API key is not configured");
        }
        Map<String, Object> genConfig = new LinkedHashMap<>();
        genConfig.put("temperature", 0.5);
        if (jsonMode) genConfig.put("responseMimeType", "application/json");

        Map<String, Object> payload = Map.of(
                "contents", List.of(Map.of("parts", List.of(Map.of("text", prompt)))),
                "generationConfig", genConfig
        );
        String jsonBody = mapper.writeValueAsString(payload);
        List<String> models = List.of("gemini-flash-lite-latest", "gemini-3.5-flash-lite", "gemini-3-flash-preview");
        String lastErr = "";
        for (String model : models) {
            HttpRequest req = HttpRequest.newBuilder()
                    .uri(URI.create("https://generativelanguage.googleapis.com/v1beta/models/" + model + ":generateContent"))
                    .header("x-goog-api-key", geminiApiKey)
                    .timeout(Duration.ofSeconds(12)).header("Content-Type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(jsonBody))
                    .build();
            HttpResponse<String> resp = http.send(req, HttpResponse.BodyHandlers.ofString());
            if (resp.statusCode() < 400) {
                JsonNode root = mapper.readTree(resp.body());
                return root.path("candidates").get(0).path("content").path("parts").get(0).path("text").asText();
            }
            lastErr = "Gemini HTTP " + resp.statusCode() + " (" + model + "): " + resp.body();
            if (resp.statusCode() != 503 && resp.statusCode() != 429) break;
        }
        throw new RuntimeException(lastErr);
    }
}