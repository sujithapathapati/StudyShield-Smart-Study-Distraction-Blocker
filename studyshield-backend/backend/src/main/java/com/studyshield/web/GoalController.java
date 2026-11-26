package com.studyshield.web;

import com.studyshield.model.Models.*;
import com.studyshield.repo.Repos.GoalRepo;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/goals")
public class GoalController {
    record GoalReq(@NotBlank @Size(max = 100) String title, @Size(max = 500) String description,
                   @Min(5) @Max(480) int durationMinutes, @NotNull Priority priority, LocalDate scheduledDate) {}
    record CompleteReq(boolean completed) {}

    private final GoalRepo goals;
    public GoalController(GoalRepo goals) { this.goals = goals; }

    private Goal owned(String id, String uid) {
        return goals.findByIdAndUserId(id, uid).orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Goal not found"));
    }

    @GetMapping List<Goal> list(@AuthenticationPrincipal String uid) { return goals.findByUserIdOrderByCreatedAtDesc(uid); }

    @PostMapping Goal create(@AuthenticationPrincipal String uid, @Valid @RequestBody GoalReq r) {
        Goal g = new Goal(); g.userId = uid; apply(g, r); return goals.save(g);
    }

    @PutMapping("/{id}") Goal update(@AuthenticationPrincipal String uid, @PathVariable String id, @Valid @RequestBody GoalReq r) {
        Goal g = owned(id, uid); apply(g, r); return goals.save(g);
    }

    @PatchMapping("/{id}/complete") Goal complete(@AuthenticationPrincipal String uid, @PathVariable String id, @RequestBody CompleteReq r) {
        Goal g = owned(id, uid); g.completed = r.completed(); g.completedAt = r.completed() ? Instant.now() : null; return goals.save(g);
    }

    @DeleteMapping("/{id}") ResponseEntity<Void> delete(@AuthenticationPrincipal String uid, @PathVariable String id) {
        goals.delete(owned(id, uid)); return ResponseEntity.noContent().build();
    }

    private static void apply(Goal g, GoalReq r) {
        g.title = r.title().trim(); g.description = r.description(); g.durationMinutes = r.durationMinutes();
        g.priority = r.priority(); g.scheduledDate = r.scheduledDate();
    }
}
