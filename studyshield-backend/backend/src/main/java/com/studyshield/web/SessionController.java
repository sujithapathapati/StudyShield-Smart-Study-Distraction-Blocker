package com.studyshield.web;

import com.studyshield.model.Models.*;
import com.studyshield.repo.Repos.*;
import com.studyshield.service.BreakPolicy;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.Duration;
import java.time.Instant;
import java.util.EnumSet;
import java.util.Map;

/**
 * The timer's source of truth: server timestamps. The client derives elapsed time as
 * accumulatedFocusMs + (now - lastResumedAt) while ACTIVE, so refreshes, tab switches
 * and laptop sleep never lose time.
 */
@RestController
@RequestMapping("/api/sessions")
public class SessionController {
    static final EnumSet<SessionStatus> OPEN = EnumSet.of(SessionStatus.ACTIVE, SessionStatus.PAUSED, SessionStatus.BREAK);
    record StartReq(String goalId) {}
    record CompleteReq(boolean markGoalComplete) {}

    private final SessionRepo sessions; private final GoalRepo goals; private final int breakMinutes;
    public SessionController(SessionRepo s, GoalRepo g, @Value("${studyshield.break-minutes}") int breakMinutes) {
        this.sessions = s; this.goals = g; this.breakMinutes = breakMinutes;
    }

    private Map<String, Object> dto(StudySession s) {
        if (s == null) return null;
        var m = new java.util.LinkedHashMap<String, Object>();
        m.put("id", s.id); m.put("goalId", s.goalId); m.put("goalTitle", s.goalTitle);
        m.put("plannedMinutes", s.plannedMinutes); m.put("status", s.status);
        m.put("startedAt", s.startedAt); m.put("endedAt", s.endedAt);
        m.put("accumulatedFocusMs", s.accumulatedFocusMs); m.put("lastResumedAt", s.lastResumedAt);
        m.put("breakEndsAt", s.breakEndsAt); m.put("breaksTaken", s.breaksTaken);
        m.put("breaksAllowed", s.breaksAllowed); m.put("breakMinutes", s.breakMinutes);
        m.put("serverNow", Instant.now());
        return m;
    }

    private StudySession owned(String id, String uid) {
        return sessions.findByIdAndUserId(id, uid).orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Session not found"));
    }
    private static void bank(StudySession s, Instant now) {
        if (s.status == SessionStatus.ACTIVE && s.lastResumedAt != null)
            s.accumulatedFocusMs += Duration.between(s.lastResumedAt, now).toMillis();
        s.lastResumedAt = null;
    }
    private static void require(StudySession s, SessionStatus st) {
        if (s.status != st) throw new ApiException(HttpStatus.CONFLICT, "Session is " + s.status.name().toLowerCase());
    }

    @GetMapping("/active")
    Map<String, Object> active(@AuthenticationPrincipal String uid) {
        return dto(sessions.findFirstByUserIdAndStatusIn(uid, OPEN).orElse(null));
    }

    @PostMapping("/start")
    Map<String, Object> start(@AuthenticationPrincipal String uid, @RequestBody StartReq r) {
        if (sessions.findFirstByUserIdAndStatusIn(uid, OPEN).isPresent())
            throw new ApiException(HttpStatus.CONFLICT, "You already have a session running.");
        Goal g = goals.findByIdAndUserId(r.goalId(), uid).orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "That goal no longer exists. Pick another."));
        if (g.completed) throw new ApiException(HttpStatus.CONFLICT, "That goal is already completed. Pick another.");
        StudySession s = new StudySession();
        Instant now = Instant.now();
        s.userId = uid; s.goalId = g.id; s.goalTitle = g.title; s.plannedMinutes = g.durationMinutes;
        s.status = SessionStatus.ACTIVE; s.startedAt = now; s.lastResumedAt = now;
        s.breaksAllowed = BreakPolicy.breaksAllowed(g.durationMinutes); s.breakMinutes = breakMinutes;
        return dto(sessions.save(s));
    }

    @PostMapping("/{id}/pause")
    Map<String, Object> pause(@AuthenticationPrincipal String uid, @PathVariable String id) {
        StudySession s = owned(id, uid); require(s, SessionStatus.ACTIVE);
        bank(s, Instant.now()); s.status = SessionStatus.PAUSED; return dto(sessions.save(s));
    }

    @PostMapping("/{id}/resume")
    Map<String, Object> resume(@AuthenticationPrincipal String uid, @PathVariable String id) {
        StudySession s = owned(id, uid); require(s, SessionStatus.PAUSED);
        s.status = SessionStatus.ACTIVE; s.lastResumedAt = Instant.now(); return dto(sessions.save(s));
    }

    @PostMapping("/{id}/break/start")
    Map<String, Object> breakStart(@AuthenticationPrincipal String uid, @PathVariable String id) {
        StudySession s = owned(id, uid); require(s, SessionStatus.ACTIVE);
        if (s.breaksTaken >= s.breaksAllowed) throw new ApiException(HttpStatus.CONFLICT, "No breaks left for this session length.");
        Instant now = Instant.now(); bank(s, now);
        s.status = SessionStatus.BREAK; s.breaksTaken++; s.breakEndsAt = now.plus(Duration.ofMinutes(s.breakMinutes));
        return dto(sessions.save(s));
    }

    @PostMapping("/{id}/break/end")
    Map<String, Object> breakEnd(@AuthenticationPrincipal String uid, @PathVariable String id) {
        StudySession s = owned(id, uid); require(s, SessionStatus.BREAK);
        s.status = SessionStatus.ACTIVE; s.breakEndsAt = null; s.lastResumedAt = Instant.now(); return dto(sessions.save(s));
    }

    @PostMapping("/{id}/complete")
    Map<String, Object> complete(@AuthenticationPrincipal String uid, @PathVariable String id, @RequestBody CompleteReq r) {
        StudySession s = owned(id, uid);
        if (!OPEN.contains(s.status)) throw new ApiException(HttpStatus.CONFLICT, "Session already ended.");
        Instant now = Instant.now(); bank(s, now);
        s.status = SessionStatus.COMPLETED; s.endedAt = now; s.breakEndsAt = null;
        sessions.save(s);
        // Only the goal tied to THIS session is ever completed.
        if (r.markGoalComplete()) goals.findByIdAndUserId(s.goalId, uid).ifPresent(g -> {
            g.completed = true; g.completedAt = now; goals.save(g);
        });
        return dto(s);
    }

    @PostMapping("/{id}/cancel")
    Map<String, Object> cancel(@AuthenticationPrincipal String uid, @PathVariable String id) {
        StudySession s = owned(id, uid);
        if (!OPEN.contains(s.status)) throw new ApiException(HttpStatus.CONFLICT, "Session already ended.");
        s.status = SessionStatus.CANCELLED; s.endedAt = Instant.now(); s.lastResumedAt = null;
        return dto(sessions.save(s));
    }
}
