package com.studyshield.web;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.util.Map;

public class ApiException extends RuntimeException {
    public final HttpStatus status;
    public ApiException(HttpStatus status, String msg) { super(msg); this.status = status; }

    @RestControllerAdvice
    public static class Handler {
        @ExceptionHandler(ApiException.class)
        ResponseEntity<Map<String, String>> api(ApiException e) {
            return ResponseEntity.status(e.status).body(Map.of("message", e.getMessage()));
        }
        @ExceptionHandler(MethodArgumentNotValidException.class)
        ResponseEntity<Map<String, String>> invalid(MethodArgumentNotValidException e) {
            var f = e.getBindingResult().getFieldErrors().stream().findFirst();
            String msg = f.map(x -> x.getField() + ": " + x.getDefaultMessage()).orElse("Invalid input");
            return ResponseEntity.badRequest().body(Map.of("message", msg));
        }
        @ExceptionHandler(org.springframework.dao.OptimisticLockingFailureException.class)
        ResponseEntity<Map<String, String>> conflict() {
            return ResponseEntity.status(409).body(Map.of("message", "Session changed in another tab. Refreshing."));
        }
    }
}
