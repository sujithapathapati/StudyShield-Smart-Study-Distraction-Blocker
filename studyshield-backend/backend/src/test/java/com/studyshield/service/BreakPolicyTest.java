package com.studyshield.service;

import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.assertEquals;

class BreakPolicyTest {
    @Test void under30HasNoBreaks() { assertEquals(0, BreakPolicy.breaksAllowed(29)); }
    @Test void from30To59HasOne() { assertEquals(1, BreakPolicy.breaksAllowed(30)); assertEquals(1, BreakPolicy.breaksAllowed(59)); }
    @Test void from60To119HasTwo() { assertEquals(2, BreakPolicy.breaksAllowed(60)); assertEquals(2, BreakPolicy.breaksAllowed(119)); }
    @Test void from120HasThree() { assertEquals(3, BreakPolicy.breaksAllowed(120)); }
}
