package dev.alfieprojects.homebase.data.model

/**
 * Mirrors the `chores` row shape returned by the Next.js API
 * (src/lib/db/schema.ts in the web repo). Timestamps arrive as ISO-8601
 * strings; kept as strings here — parsing happens where needed.
 */
data class Chore(
    val id: Int,
    val orgId: Int,
    val residenceId: Int?,
    val title: String,
    val description: String?,
    val createdBy: Int,
    val assignedTo: List<Int>?,
    val progress: Int,
    val progressUnit: String?,
    val totalSteps: Int?,
    val completedSteps: Int?,
    val steps: String?,
    val isRecurring: Boolean?,
    val recurrencePattern: String?,
    val resetTime: String?,
    val reminderEnabled: Boolean?,
    val reminderFrequency: String?,
    val reminderCustomTimes: String?,
    val activeStartHour: Int?,
    val activeEndHour: Int?,
    val lastReminderSentAt: String?,
    val completedAt: String?,
    val lastProgressUpdateAt: String?,
    val createdAt: String,
    val updatedAt: String,
)

data class ChoreListResponse(val chores: List<Chore>)

data class ChoreResponse(val chore: Chore)

data class LoginRequest(val email: String, val password: String)

data class LoginResponse(val user: ApiUser, val token: String)

data class ApiUser(
    val id: Int,
    val email: String,
    val name: String,
    val role: String,
    val orgId: Int,
)
