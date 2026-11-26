package com.studyshield.web;

import com.studyshield.model.Models.*;
import com.studyshield.repo.Repos.*;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.*;
import java.util.*;

@RestController
@RequestMapping("/api/stats")
public class StatsController {
    private final SessionRepo sessions; private final GoalRepo goals;
    public StatsController(SessionRepo s, GoalRepo g) { this.sessions = s; this.goals = g; }

    /** tzOffset = JavaScript Date#getTimezoneOffset() (minutes, UTC minus local). */
    @GetMapping("/summary")
    Map<String, Object> summary(@AuthenticationPrincipal String uid, @RequestParam(defaultValue = "0") int tzOffset) {
        ZoneOffset zone = ZoneOffset.ofTotalSeconds(-tzOffset * 60);
        LocalDate today = LocalDate.now(zone);
        Instant since = today.minusDays(60).atStartOfDay(zone).toInstant();
        List<StudySession> done = sessions.findByUserIdAndStatusAndEndedAtAfter(uid, SessionStatus.COMPLETED, since);

        Map<LocalDate, Long> perDay = new TreeMap<>();
        long plannedMs = 0, focusMs = 0;
        for (StudySession s : done) {
            perDay.merge(s.endedAt.atZone(zone).toLocalDate(), s.accumulatedFocusMs, Long::sum);
            plannedMs += s.plannedMinutes * 60_000L; focusMs += s.accumulatedFocusMs;
        }
        List<Map<String, Object>> daily = new ArrayList<>();
        long week = 0;
        for (int i = 6; i >= 0; i--) {
            LocalDate d = today.minusDays(i);
            long m = perDay.getOrDefault(d, 0L) / 60_000;
            week += m;
            daily.add(Map.of("date", d.toString(), "minutes", m));
        }
        int streak = 0;
        LocalDate d = perDay.containsKey(today) ? today : today.minusDays(1);
        while (perDay.getOrDefault(d, 0L) > 0) { streak++; d = d.minusDays(1); }

        List<Goal> gs = goals.findByUserIdOrderByCreatedAtDesc(uid);
        Map<String, Object> r = new LinkedHashMap<>();
        r.put("todayMinutes", perDay.getOrDefault(today, 0L) / 60_000);
        r.put("weekMinutes", week);
        r.put("completedSessions", sessions.countByUserIdAndStatus(uid, SessionStatus.COMPLETED));
        r.put("currentStreak", streak);
        r.put("goalsTotal", gs.size());
        r.put("goalsCompleted", gs.stream().filter(g -> g.completed).count());
        r.put("focusScore", plannedMs == 0 ? 0 : Math.min(100, Math.round(focusMs * 100.0 / plannedMs)));
        r.put("daily", daily);
        return r;
    }
}
