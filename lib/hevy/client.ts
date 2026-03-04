const HEVY_API_BASE = "https://api.hevyapp.com/v1";

/**
 * Minimal Hevy API client. Uses a simple api-key header for auth.
 */
class HevyClient {
    private apiKey: string;

    constructor(apiKey: string) {
        this.apiKey = apiKey;
    }

    private async request<T = any>(path: string, options?: RequestInit): Promise<T> {
        const url = `${HEVY_API_BASE}${path}`;
        const resp = await fetch(url, {
            ...options,
            headers: {
                "api-key": this.apiKey,
                "Content-Type": "application/json",
                ...(options?.headers || {}),
            },
        });
        if (!resp.ok) {
            const text = await resp.text();
            throw new Error(`Hevy API ${resp.status}: ${text}`);
        }
        return resp.json();
    }

    /** Paginated list of workouts (max 10 per page) */
    async getWorkouts(page = 1, pageSize = 10) {
        return this.request(`/workouts?page=${page}&pageSize=${pageSize}`);
    }

    /** Single workout by ID */
    async getWorkout(workoutId: string) {
        return this.request(`/workouts/${workoutId}`);
    }

    /** Total workout count */
    async getWorkoutCount() {
        return this.request<{ workout_count: number }>("/workouts/count");
    }

    /** Paginated list of exercise templates */
    async getExerciseTemplates(page = 1, pageSize = 10) {
        return this.request(`/exercise_templates?page=${page}&pageSize=${pageSize}`);
    }

    /** Single exercise template by ID */
    async getExerciseTemplate(templateId: string) {
        return this.request(`/exercise_templates/${templateId}`);
    }

    /** Exercise history for a specific template, with optional date filters */
    async getExerciseHistory(templateId: string, startDate?: string, endDate?: string) {
        let path = `/exercise_history/${templateId}`;
        const params: string[] = [];
        if (startDate) params.push(`start_date=${startDate}T00:00:00Z`);
        if (endDate) params.push(`end_date=${endDate}T23:59:59Z`);
        if (params.length > 0) path += `?${params.join("&")}`;
        return this.request(path);
    }

    /** Paginated list of routines */
    async getRoutines(page = 1, pageSize = 10) {
        return this.request(`/routines?page=${page}&pageSize=${pageSize}`);
    }

    /** Single routine by ID */
    async getRoutine(routineId: string) {
        return this.request(`/routines/${routineId}`);
    }
}

// ─── Singleton ────────────────────────────────────────────

let _client: HevyClient | null = null;

export function getHevyClient(): HevyClient {
    if (_client) return _client;
    const key = process.env.HEVY_API_KEY;
    if (!key) throw new Error("HEVY_API_KEY environment variable is not set");
    _client = new HevyClient(key);
    return _client;
}
