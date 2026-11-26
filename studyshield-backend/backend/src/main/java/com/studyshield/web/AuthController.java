package com.studyshield.web;

import com.studyshield.model.Models.User;
import com.studyshield.repo.Repos.UserRepo;
import com.studyshield.security.JwtService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api")
public class AuthController {
    record SignupReq(@NotBlank @Size(min = 2, max = 80) String fullName, @Email @NotBlank String email,
                     @NotBlank @Pattern(regexp = "^(?=.*[A-Za-z])(?=.*\\d).{8,72}$", message = "needs 8+ chars with letters and numbers") String password) {}
    record LoginReq(@Email @NotBlank String email, @NotBlank String password) {}
    record UserDto(String id, String fullName, String email) {
        static UserDto of(User u) { return new UserDto(u.id, u.fullName, u.email); }
    }
    record AuthRes(String token, UserDto user) {}

    private final UserRepo users; private final PasswordEncoder enc; private final JwtService jwt;
    public AuthController(UserRepo users, PasswordEncoder enc, JwtService jwt) { this.users = users; this.enc = enc; this.jwt = jwt; }

    @GetMapping("/health") Map<String, String> health() { return Map.of("status", "ok"); }

    @PostMapping("/auth/signup")
    AuthRes signup(@Valid @RequestBody SignupReq r) {
        String email = r.email().trim().toLowerCase();
        if (users.findByEmail(email).isPresent()) throw new ApiException(HttpStatus.CONFLICT, "An account with this email already exists.");
        User u = new User();
        u.fullName = r.fullName().trim(); u.email = email; u.passwordHash = enc.encode(r.password());
        users.save(u);
        return new AuthRes(jwt.issue(u.id), UserDto.of(u));
    }

    @PostMapping("/auth/login")
    AuthRes login(@Valid @RequestBody LoginReq r) {
        User u = users.findByEmail(r.email().trim().toLowerCase())
                .filter(x -> enc.matches(r.password(), x.passwordHash))
                .orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, "Wrong email or password."));
        return new AuthRes(jwt.issue(u.id), UserDto.of(u));
    }

    @GetMapping("/auth/me")
    UserDto me(@AuthenticationPrincipal String uid) {
        return users.findById(uid).map(UserDto::of).orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, "Session expired"));
    }
}
