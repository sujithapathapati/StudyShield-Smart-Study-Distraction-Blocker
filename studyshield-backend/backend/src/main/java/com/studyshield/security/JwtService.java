package com.studyshield.security;

import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.Instant;
import java.util.Date;

@Service
public class JwtService {
    private final SecretKey key;
    private final long expiryHours;

    public JwtService(@Value("${studyshield.jwt.secret}") String secret,
                      @Value("${studyshield.jwt.expiry-hours}") long expiryHours) {
        this.key = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
        this.expiryHours = expiryHours;
    }

    public String issue(String userId) {
        Instant now = Instant.now();
        return Jwts.builder().subject(userId).issuedAt(Date.from(now))
                .expiration(Date.from(now.plus(Duration.ofHours(expiryHours)))).signWith(key).compact();
    }

    /** Returns the user id, or null when the token is invalid/expired. */
    public String verify(String token) {
        try {
            return Jwts.parser().verifyWith(key).build().parseSignedClaims(token).getPayload().getSubject();
        } catch (Exception e) {
            return null;
        }
    }
}
