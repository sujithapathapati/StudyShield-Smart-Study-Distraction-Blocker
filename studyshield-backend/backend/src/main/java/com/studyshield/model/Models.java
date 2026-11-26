package com.studyshield.model;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

public final class Models {
    private Models() {}

    public enum Priority { LOW, MEDIUM, HIGH }
    public enum SessionStatus { ACTIVE, PAUSED, BREAK, COMPLETED, CANCELLED }

    @Document("users")
    public static class User {
        @Id public String id;
        public String fullName;
        @Indexed(unique = true) public String email;
        public String passwordHash;
        public Instant createdAt = Instant.now();
    }

    @Document("goals")
    public static class Goal {
        @Id public String id;
        @Indexed public String userId;
        public String title;
        public String description;
        public int durationMinutes;
        public Priority priority = Priority.MEDIUM;
        public LocalDate scheduledDate;
        public boolean completed;
        public Instant completedAt;
        public Instant createdAt = Instant.now();
        public String source = "MANUAL"; // MANUAL | AI_PLANNER | AI_CHAT
    }

    @Document("sessions")
    public static class StudySession {
        @Id public String id;
        @Indexed public String userId;
        public String goalId;
        public String goalTitle;
        public int plannedMinutes;
        public SessionStatus status;
        public Instant startedAt;
        public Instant endedAt;
        public long accumulatedFocusMs;
        public Instant lastResumedAt;
        public Instant breakEndsAt;
        public int breaksTaken;
        public int breaksAllowed;
        public int breakMinutes;
        @org.springframework.data.annotation.Version public Long version;
    }

    @Document("blocked_sites")
    public static class BlockedSite {
        @Id public String id;
        @Indexed public String userId;
        public String name;
        public String domain;
        public boolean enabled = true;
        public Instant createdAt = Instant.now();
    }

    @Document("user_settings")
    public static class UserSettings {
        @Id public String userId;
        public int defaultSessionMinutes = 30;
        public int breakMinutes = 5;
        public boolean smartYoutubeEnabled = true;
        public boolean blockYoutubeHome = true;
        public boolean blockYoutubeShorts = true;
        public boolean hideYoutubeRecommendations = true;
        public boolean hideYoutubeComments = true;
        public String aiStyle = "BALANCED";
    }

    public static class PlanTaskItem {
        public String id;
        public String title;
        public String description;
        public int durationMinutes;
        public Priority priority = Priority.MEDIUM;
        public String dayLabel;
        public boolean completed;
        public boolean convertedToGoal;
    }

    @Document("ai_plans")
    public static class AiPlan {
        @Id public String id;
        @Indexed public String userId;
        public String title;
        public String subject;
        public String targetDate;
        public String summary;
        public List<PlanTaskItem> items = new ArrayList<>();
        public Instant createdAt = Instant.now();
    }

    public static class ChatMessageItem {
        public String role; // user | assistant
        public String content;
        public Instant timestamp = Instant.now();
    }

    @Document("ai_conversations")
    public static class AiConversation {
        @Id public String id;
        @Indexed public String userId;
        public String title;
        public List<ChatMessageItem> messages = new ArrayList<>();
        public Instant updatedAt = Instant.now();
    }
}