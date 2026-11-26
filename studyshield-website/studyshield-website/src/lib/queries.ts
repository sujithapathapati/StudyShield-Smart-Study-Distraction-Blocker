import { useQuery } from "@tanstack/react-query";
import { api, type Goal, type Stats } from "./api";

export const useGoals = () => useQuery({ queryKey: ["goals"], queryFn: () => api<Goal[]>("/api/goals") });
export const useStats = () => useQuery({ queryKey: ["stats"], queryFn: () => api<Stats>(`/api/stats/summary?tzOffset=${new Date().getTimezoneOffset()}`) });
