package com.studyshield.service;

/** Break rules: under 30 min none, 30–59 one, 60–119 two, 120+ three. */
public final class BreakPolicy {
    private BreakPolicy() {}
    public static int breaksAllowed(int plannedMinutes) {
        if (plannedMinutes < 30) return 0;
        if (plannedMinutes < 60) return 1;
        if (plannedMinutes < 120) return 2;
        return 3;
    }
}
