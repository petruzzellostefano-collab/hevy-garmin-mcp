import { z } from "zod";
import { getGarminClient } from "./client";
import { GARMIN_ENDPOINTS } from "./endpoints";
import { ActivityType } from "@flow-js/garmin-connect";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

// ─── Helpers ─────────────────────────────────────────────

/** Format a date to YYYY-MM-DD */
function formatDate(date: Date): string {
    return date.toISOString().split("T")[0];
}

/** Safely JSON.stringify with nice formatting */
function jsonResponse(data: unknown) {
    return {
        content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
    };
}

/** Get the Monday of the week containing the given date */
function getMonday(date: Date): Date {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    d.setDate(diff);
    d.setHours(0, 0, 0, 0);
    return d;
}

// ─── Mappers — strip Garmin DTOs to training-relevant fields ─────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapActivitySummary(a: any) {
    return {
        activityId: a.activityId,
        name: a.activityName,
        type: a.activityType?.typeKey ?? a.activityTypeDTO?.typeKey,
        date: a.startTimeLocal,
        distanceMeters: a.distance,
        durationSeconds: a.duration,
        movingDurationSeconds: a.movingDuration,
        averageSpeedMps: a.averageSpeed,
        maxSpeedMps: a.maxSpeed,
        averageHR: a.averageHR,
        maxHR: a.maxHR,
        calories: a.calories,
        elevationGainMeters: a.elevationGain,
        elevationLossMeters: a.elevationLoss,
        averageCadence: a.averageRunningCadenceInStepsPerMinute ?? a.averageRunCadence,
        lapCount: a.lapCount ?? a.metadataDTO?.lapCount,
        vO2Max: a.vO2MaxValue,
        averageStrideLength: a.avgStrideLength,
        hasSplits: a.hasSplits ?? a.metadataDTO?.hasSplits,
    };
}

/**
 * Map the full activity detail (from getActivity) to training-relevant fields.
 * This includes summaryDTO data that has richer fields than the list endpoint.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapActivityDetail(a: any) {
    const s = a.summaryDTO || {};
    return {
        activityId: a.activityId,
        name: a.activityName,
        type: a.activityTypeDTO?.typeKey,
        date: s.startTimeLocal,
        location: a.locationName,
        timezone: a.timeZoneUnitDTO?.timeZone,

        // Distance & duration
        distanceMeters: s.distance,
        durationSeconds: s.duration,
        movingDurationSeconds: s.movingDuration,
        elapsedDurationSeconds: s.elapsedDuration,

        // Speed
        averageSpeedMps: s.averageSpeed,
        averageMovingSpeedMps: s.averageMovingSpeed,
        maxSpeedMps: s.maxSpeed,
        avgGradeAdjustedSpeedMps: s.avgGradeAdjustedSpeed,

        // Heart rate
        averageHR: s.averageHR,
        maxHR: s.maxHR,
        minHR: s.minHR,

        // Running dynamics
        averageCadenceSpm: s.averageRunCadence,
        maxCadenceSpm: s.maxRunCadence,
        strideLengthCm: s.strideLength,
        verticalOscillationCm: s.verticalOscillation,
        verticalRatioPct: s.verticalRatio,
        groundContactTimeMs: s.groundContactTime,

        // Elevation
        elevationGainMeters: s.elevationGain,
        elevationLossMeters: s.elevationLoss,
        maxElevationMeters: s.maxElevation,
        minElevationMeters: s.minElevation,

        // Training effect
        calories: s.calories,
        trainingEffect: s.trainingEffect,
        anaerobicTrainingEffect: s.anaerobicTrainingEffect,
        trainingEffectLabel: s.trainingEffectLabel,
        trainingLoad: s.activityTrainingLoad,
        aerobicMessage: s.aerobicTrainingEffectMessage,
        anaerobicMessage: s.anaerobicTrainingEffectMessage,

        // Stamina & body
        steps: s.steps,
        bodyBatteryChange: s.differenceBodyBattery,
        beginStamina: s.beginPotentialStamina,
        endStamina: s.endPotentialStamina,
        minStamina: s.minAvailableStamina,
        waterEstimatedMl: s.waterEstimated,
        moderateIntensityMinutes: s.moderateIntensityMinutes,
        vigorousIntensityMinutes: s.vigorousIntensityMinutes,

        // Perceived effort (user-reported)
        workoutFeel: s.directWorkoutFeel,
        workoutRpe: s.directWorkoutRpe,

        // Sensors
        sensors: a.metadataDTO?.sensors?.map(
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (sensor: any) => ({
                manufacturer: sensor.manufacturer,
                type: sensor.antplusDeviceType ?? sensor.bleDeviceType,
            })
        ),

        // Split summaries (run/walk/interval breakdowns)
        splitSummaries: a.splitSummaries?.map(mapSplitSummary),
    };
}

/** Map a split summary to training-relevant fields */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapSplitSummary(s: any) {
    return {
        splitType: s.splitType,
        noOfSplits: s.noOfSplits,
        distanceMeters: s.distance,
        durationSeconds: s.duration,
        movingDurationSeconds: s.movingDuration,
        averageSpeedMps: s.averageSpeed,
        maxSpeedMps: s.maxSpeed,
        averageHR: s.averageHR,
        maxHR: s.maxHR,
        averageCadenceSpm: s.averageRunCadence,
        maxCadenceSpm: s.maxRunCadence,
        strideLengthCm: s.strideLength,
        verticalOscillationCm: s.verticalOscillation,
        groundContactTimeMs: s.groundContactTime,
        elevationGainMeters: s.elevationGain,
        elevationLossMeters: s.elevationLoss,
        calories: s.calories,
    };
}

/** Map a per-km/interval lap to training-relevant fields */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapLap(lap: any) {
    return {
        lapIndex: lap.lapIndex,
        intensityType: lap.intensityType,
        distanceMeters: lap.distance,
        durationSeconds: lap.duration,
        movingDurationSeconds: lap.movingDuration,
        averageSpeedMps: lap.averageSpeed,
        averageMovingSpeedMps: lap.averageMovingSpeed,
        maxSpeedMps: lap.maxSpeed,
        averageHR: lap.averageHR,
        maxHR: lap.maxHR,
        averageCadenceSpm: lap.averageRunCadence,
        maxCadenceSpm: lap.maxRunCadence,
        strideLengthCm: lap.strideLength,
        verticalOscillationCm: lap.verticalOscillation,
        groundContactTimeMs: lap.groundContactTime,
        elevationGainMeters: lap.elevationGain,
        elevationLossMeters: lap.elevationLoss,
        calories: lap.calories,
        avgGradeAdjustedSpeedMps: lap.avgGradeAdjustedSpeed,
        complianceScore: lap.directWorkoutComplianceScore,
    };
}

/** Map a calendar item to training-relevant fields */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapCalendarItem(item: any) {
    return {
        id: item.id,
        itemType: item.itemType,
        title: item.title,
        date: item.date,
        durationMs: item.duration,
        distanceMeters: item.distance,
        calories: item.calories,
        averageHR: item.averageHR,
        lapCount: item.lapCount,
        hasSplits: item.hasSplits,
        workoutId: item.workoutId,
        activityTypeId: item.activityTypeId,
    };
}

/** Map a workout step to coaching-relevant fields */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapWorkoutStep(step: any): any {
    // Repeat blocks have child steps
    if (step.type === "RepeatGroupDTO" && step.workoutSteps) {
        return {
            type: "repeat",
            stepOrder: step.stepOrder,
            numberOfIterations: step.numberOfIterations,
            steps: step.workoutSteps.map(mapWorkoutStep),
        };
    }

    // Executable steps (warmup, run, rest, cooldown)
    return {
        stepOrder: step.stepOrder,
        stepType: step.stepType?.stepTypeKey,
        description: step.description,
        endCondition: step.endCondition?.conditionTypeKey,
        endConditionValue: step.endConditionValue,
        endConditionUnit: step.preferredEndConditionUnit?.unitKey,
        targetType: step.targetType?.workoutTargetTypeKey,
        targetValueOne: step.targetValueOne,
        targetValueTwo: step.targetValueTwo,
        targetUnit: step.targetValueUnit,
        secondaryTargetType: step.secondaryTargetType?.workoutTargetTypeKey,
        secondaryTargetValueOne: step.secondaryTargetValueOne,
        secondaryTargetValueTwo: step.secondaryTargetValueTwo,
    };
}

/** Map a full workout detail to coaching-relevant fields */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapWorkoutDetail(w: any) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const segments = w.workoutSegments?.map((seg: any) => ({
        sportType: seg.sportType?.sportTypeKey,
        steps: seg.workoutSteps?.map(mapWorkoutStep) ?? [],
    })) ?? [];

    return {
        workoutId: w.workoutId,
        name: w.workoutName,
        description: w.description,
        sportType: w.sportType?.sportTypeKey,
        provider: w.workoutProvider ?? w.consumerName,
        providerImageUrl: w.consumerImageURL,
        estimatedDurationSeconds: w.estimatedDurationInSecs,
        estimatedDistanceMeters: w.estimatedDistanceInMeters,
        createdDate: w.createdDate,
        segments,
    };
}

/** Map a daily sleep summary to coaching-relevant recovery fields */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapSleepSummary(s: any) {
    const d = s.dailySleepDTO || {};
    return {
        date: d.calendarDate,
        sleepScore: d.sleepScores?.overall?.value,
        sleepScoreLabel: d.sleepScores?.overall?.qualifierKey,
        sleepScoreFeedback: d.sleepScoreFeedback,
        sleepScoreInsight: d.sleepScoreInsight,
        durationSeconds: d.sleepTimeSeconds,
        deepSleepSeconds: d.deepSleepSeconds,
        lightSleepSeconds: d.lightSleepSeconds,
        remSleepSeconds: d.remSleepSeconds,
        awakeCount: d.awakeCount,
        averageRespirationValue: d.averageRespirationValue,
        avgSleepStress: d.avgSleepStress,
        avgOvernightHrv: s.avgOvernightHrv,
        hrvStatus: s.hrvStatus,
        restingHeartRate: s.restingHeartRate,
        bodyBatteryChange: s.bodyBatteryChange,
        sleepNeedBaseline: d.sleepNeed?.baseline,
        sleepNeedActual: d.sleepNeed?.actual,
    };
}

// ─── Tool Registration ──────────────────────────────────

export function registerGarminTools(server: McpServer) {
    // ─── Tool 1: get_recent_activities ───
    server.registerTool(
        "get_recent_activities",
        {
            title: "Get Recent Activities",
            description:
                "Returns a list of recent Garmin activities with summary data. Use this to see training history. Units (verified from Garmin API): distanceMeters=meters, durationSeconds/movingDurationSeconds=seconds, averageSpeedMps/maxSpeedMps=meters per second, averageHR/maxHR=bpm, elevationGainMeters/elevationLossMeters=meters, averageCadence=steps per minute, averageStrideLength=centimeters, calories=kcal.",
            inputSchema: {
                limit: z
                    .number()
                    .int()
                    .min(1)
                    .max(50)
                    .default(10)
                    .describe("Number of activities to return (1-50, default 10)"),
                activityType: z
                    .enum(["running", "cycling", "walking", "hiking", "all"])
                    .default("all")
                    .describe("Filter by activity type"),
            },
        },
        async (input) => {
            const client = await getGarminClient();
            const limit = (input.limit) || 10;
            const typeFilter = input.activityType as string;

            const activityTypeMap: Record<string, ActivityType | undefined> = {
                running: ActivityType.Running,
                cycling: ActivityType.Cycling,
                walking: ActivityType.Walking,
                hiking: ActivityType.Hiking,
                all: undefined,
            };

            const activities = await client.getActivities(
                0,
                limit,
                activityTypeMap[typeFilter]
            );

            return jsonResponse(activities.map(mapActivitySummary));
        }
    );

    // ─── Tool 2: get_activity_detail ───
    server.registerTool(
        "get_activity_detail",
        {
            title: "Get Activity Detail",
            description:
                "Returns full detail for a single activity including per-lap splits. Provide the activityId from get_recent_activities. Garmin API units (verified): distance=meters, duration/movingDuration/elapsedDuration=seconds, averageSpeed/maxSpeed=m/s, averageHR/maxHR=bpm, averageCadenceSpm/maxCadenceSpm=steps per minute, strideLengthCm=centimeters, verticalOscillationCm=centimeters, groundContactTimeMs=milliseconds, verticalRatioPct=percentage, elevation=meters, calories=kcal. Lap intensityType can be WARMUP, ACTIVE, REST, RECOVERY, INTERVAL, or COOLDOWN.",
            inputSchema: {
                activityId: z
                    .number()
                    .int()
                    .describe("The Garmin activity ID"),
            },
        },
        async (input) => {
            const client = await getGarminClient();
            const activityId = input.activityId;

            // Fetch activity summary
            const activity = await client.getActivity({ activityId });

            // Fetch per-lap splits via custom endpoint
            let laps: ReturnType<typeof mapLap>[] = [];
            try {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const splits: any = await client.get(
                    GARMIN_ENDPOINTS.activitySplits(activityId)
                );
                if (splits?.lapDTOs) {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    laps = splits.lapDTOs.map((lap: any) => mapLap(lap));
                }
            } catch (error) {
                console.warn("Failed to fetch splits:", error);
            }

            return jsonResponse({
                ...mapActivityDetail(activity),
                laps,
            });
        }
    );

    // ─── Tool 3: get_planned_workout ───
    server.registerTool(
        "get_planned_workout",
        {
            title: "Get Planned Workout",
            description:
                "Returns the planned/scheduled workout for a specific date, including structured intervals and pace targets. Returns empty arrays if no workout is scheduled. Workout structure: segments contain steps, each step has stepType (warmup/interval/rest/cooldown), endCondition (distance/time), endConditionValue (meters if distance, seconds if time), endConditionUnit. For pace targets: targetType='pace.zone', targetValueOne/targetValueTwo are pace range in m/s (higher value = faster pace). Repeat blocks have type='repeat' with numberOfIterations and nested steps.",
            inputSchema: {
                date: z
                    .string()
                    .describe(
                        "Date to check for planned workout (YYYY-MM-DD format). Defaults to today if not provided."
                    )
                    .default(""),
            },
        },
        async (input) => {
            const client = await getGarminClient();
            const dateStr = (input.date) || formatDate(new Date());
            const date = new Date(dateStr);

            // Get calendar events for the week containing this date
            const monday = getMonday(date);
            const calendarEvents = await client.getWeekCalendarEvents(
                monday.getFullYear(),
                monday.getMonth(),
                monday.getDate()
            );

            // Look for workout events on the requested date
            const items = (calendarEvents)?.calendarItems || [];
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const workoutItems = items.filter((item: any) => {
                const itemDate = item.date || item.startDate || "";
                return (
                    itemDate.startsWith(dateStr) &&
                    (item.itemType === "workout" ||
                        item.workoutId ||
                        item.itemType === "WORKOUT")
                );
            });

            // If workouts found, fetch their details
            const workoutDetails = [];
            for (const item of workoutItems) {
                const workoutId = item.workoutId;
                if (workoutId) {
                    try {
                        const detail = await client.getWorkoutDetail({
                            workoutId: String(workoutId),
                        });
                        workoutDetails.push(mapWorkoutDetail(detail));
                    } catch (error) {
                        console.warn(`Failed to get workout ${workoutId}:`, error);
                        workoutDetails.push({ workoutId, error: "Failed to fetch detail" });
                    }
                }
            }

            return jsonResponse({
                date: dateStr,
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                calendarItems: workoutItems.map((item: any) => mapCalendarItem(item)),
                workoutDetails,
            });
        }
    );

    // ─── Tool 4: get_planned_vs_actual ───
    server.registerTool(
        "get_planned_vs_actual",
        {
            title: "Get Planned vs Actual",
            description:
                "Returns both the planned workout and the actual completed activity for a given date, side by side. No analysis is performed — clean data only for comparison. Planned side: workout steps with stepType, endConditionValue (meters or seconds), targetValueOne/targetValueTwo (pace range in m/s). Actual side units: distanceMeters=meters, durationSeconds=seconds, speed=m/s, HR=bpm, cadenceSpm=steps/min, strideLengthCm=centimeters, groundContactTimeMs=milliseconds, elevation=meters. Each actual lap includes complianceScore (0-100%) showing how well the planned target was met.",
            inputSchema: {
                date: z
                    .string()
                    .describe(
                        "Date to compare (YYYY-MM-DD format). Defaults to today."
                    )
                    .default(""),
                activityId: z
                    .number()
                    .int()
                    .optional()
                    .describe(
                        "Specific activity ID to use as the 'actual'. If not provided, uses the first activity found on that date."
                    ),
            },
        },
        async (input) => {
            const client = await getGarminClient();
            const dateStr = (input.date) || formatDate(new Date());
            const date = new Date(dateStr);

            // --- Planned: get scheduled workout ---
            const monday = getMonday(date);
            const calendarEvents = await client.getWeekCalendarEvents(
                monday.getFullYear(),
                monday.getMonth(),
                monday.getDate()
            );

            const items = (calendarEvents)?.calendarItems || [];
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const workoutItems = items.filter((item: any) => {
                const itemDate = item.date || item.startDate || "";
                return (
                    itemDate.startsWith(dateStr) &&
                    (item.itemType === "workout" ||
                        item.workoutId ||
                        item.itemType === "WORKOUT")
                );
            });

            let plannedWorkout = null;
            if (workoutItems.length > 0 && workoutItems[0].workoutId) {
                try {
                    const raw = await client.getWorkoutDetail({
                        workoutId: String(workoutItems[0].workoutId),
                    });
                    plannedWorkout = mapWorkoutDetail(raw);
                } catch (error) {
                    console.warn("Failed to fetch planned workout:", error);
                }
            }

            // --- Actual: get completed activity ---
            let mappedActivity = null;
            let laps: ReturnType<typeof mapLap>[] = [];

            if (input.activityId) {
                const actId = input.activityId;
                const raw = await client.getActivity({ activityId: actId });
                mappedActivity = mapActivityDetail(raw);
                try {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const splits: any = await client.get(
                        GARMIN_ENDPOINTS.activitySplits(actId)
                    );
                    if (splits?.lapDTOs) {
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        laps = splits.lapDTOs.map((lap: any) => mapLap(lap));
                    }
                } catch {
                    /* splits unavailable */
                }
            } else {
                // Find activities on this date
                const activities = await client.getActivities(0, 20);
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const match = activities.find((a: any) =>
                    a.startTimeLocal?.startsWith(dateStr)
                );
                if (match) {
                    mappedActivity = mapActivitySummary(match);
                    try {
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        const splits: any = await client.get(
                            GARMIN_ENDPOINTS.activitySplits(match.activityId)
                        );
                        if (splits?.lapDTOs) {
                            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                            laps = splits.lapDTOs.map((lap: any) => mapLap(lap));
                        }
                    } catch {
                        /* splits unavailable */
                    }
                }
            }

            return jsonResponse({
                date: dateStr,
                planned: plannedWorkout,
                actual: mappedActivity
                    ? { ...mappedActivity, laps }
                    : null,
            });
        }
    );

    // ─── Tool 5: get_week_summary ───
    server.registerTool(
        "get_week_summary",
        {
            title: "Get Week Summary",
            description:
                "Returns all activities for a given week with per-day breakdown. Useful for weekly training load review. Units: distanceMeters=meters, durationSeconds=seconds, averageSpeedMps=m/s, averageHR/maxHR=bpm, elevationGainMeters=meters, calories=kcal.",
            inputSchema: {
                date: z
                    .string()
                    .describe(
                        "Any date within the desired week (YYYY-MM-DD). Defaults to current week."
                    )
                    .default(""),
            },
        },
        async (input) => {
            const client = await getGarminClient();
            const dateStr = (input.date) || formatDate(new Date());
            const date = new Date(dateStr);
            const monday = getMonday(date);
            const sunday = new Date(monday);
            sunday.setDate(monday.getDate() + 6);

            // Get calendar events for the week
            const calendarEvents = await client.getWeekCalendarEvents(
                monday.getFullYear(),
                monday.getMonth(),
                monday.getDate()
            );

            // Get recent activities and filter to this week
            const activities = await client.getActivities(0, 50);
            const mondayStr = formatDate(monday);
            const sundayStr = formatDate(sunday);

            const weekActivities = activities.filter((a) => {
                const aDate = a.startTimeLocal?.split(" ")[0] || "";
                return aDate >= mondayStr && aDate <= sundayStr;
            });

            // Map calendar items
            const calItems = (calendarEvents)?.calendarItems || [];

            return jsonResponse({
                weekOf: mondayStr,
                weekEnd: sundayStr,
                activityCount: weekActivities.length,
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                calendarItems: calItems.map((item: any) => mapCalendarItem(item)),
                activities: weekActivities.map(mapActivitySummary),
            });
        }
    );

    // ─── Tool 6: get_daily_recovery ───
    server.registerTool(
        "get_daily_recovery",
        {
            title: "Get Sleep & Recovery Summary",
            description:
                "Returns sleep and recovery metrics for a specific date, including Sleep Score (0-100), detailed sleep stages (in seconds), overnight HRV, resting heart rate, and body battery change. Use this to determine if the user is recovered enough for an intense workout or if they need an easy day.",
            inputSchema: {
                date: z
                    .string()
                    .describe(
                        "Date to fetch sleep data for (YYYY-MM-DD format). Defaults to today if not provided."
                    )
                    .default(""),
            },
        },
        async (input) => {
            const client = await getGarminClient();
            const dateStr = (input.date) || formatDate(new Date());

            try {
                // The @flow-js library's getSleepData has issues with type definitions and timezones,
                // so we hit the Garmin endpoint directly using the client's internal get method.
                const url = `https://connectapi.garmin.com/sleep-service/sleep/dailySleepData?date=${dateStr}`;
                const sleepData = await client.get(url);
                return jsonResponse(mapSleepSummary(sleepData));
            } catch (error) {
                console.warn(`Failed to fetch sleep data for ${dateStr}:`, error);
                return jsonResponse({
                    error: `No sleep data available for ${dateStr}.`,
                });
            }
        }
    );
}
