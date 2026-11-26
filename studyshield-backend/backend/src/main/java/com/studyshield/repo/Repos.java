package com.studyshield.repo;

import com.studyshield.model.Models.*;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.time.Instant;
import java.util.*;

public final class Repos {
    private Repos() {}

    public interface UserRepo extends MongoRepository<User, String> {
        Optional<User> findByEmail(String email);
    }

    public interface GoalRepo extends MongoRepository<Goal, String> {
        List<Goal> findByUserIdOrderByCreatedAtDesc(String userId);
        Optional<Goal> findByIdAndUserId(String id, String userId);
    }

    public interface SessionRepo extends MongoRepository<StudySession, String> {
        Optional<StudySession> findFirstByUserIdAndStatusIn(String userId, Collection<SessionStatus> s);
        Optional<StudySession> findByIdAndUserId(String id, String userId);
        List<StudySession> findByUserIdAndStatusAndEndedAtAfter(String userId, SessionStatus s, Instant after);
        long countByUserIdAndStatus(String userId, SessionStatus s);
    }

    public interface BlockedSiteRepo extends MongoRepository<BlockedSite, String> {
        List<BlockedSite> findByUserIdOrderByCreatedAtDesc(String userId);
        Optional<BlockedSite> findByIdAndUserId(String id, String userId);
        boolean existsByUserIdAndDomain(String userId, String domain);
    }

    public interface UserSettingsRepo extends MongoRepository<UserSettings, String> {}

    public interface AiPlanRepo extends MongoRepository<AiPlan, String> {
        List<AiPlan> findByUserIdOrderByCreatedAtDesc(String userId);
        Optional<AiPlan> findByIdAndUserId(String id, String userId);
    }

    public interface AiConversationRepo extends MongoRepository<AiConversation, String> {
        List<AiConversation> findByUserIdOrderByUpdatedAtDesc(String userId);
        Optional<AiConversation> findByIdAndUserId(String id, String userId);
    }
}