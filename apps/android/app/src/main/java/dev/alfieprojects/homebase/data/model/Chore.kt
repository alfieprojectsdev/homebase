package dev.alfieprojects.homebase.data.model

import androidx.room.Entity
import androidx.room.PrimaryKey
import androidx.room.TypeConverter

/**
 * Mirrors the `chores` row shape returned by the Next.js API
 * (src/lib/db/schema.ts in the web repo) and doubles as the Room entity —
 * one class, no mapping layer. Timestamps arrive as ISO-8601 strings; kept
 * as strings here, parsed where needed.
 */
@Entity(tableName = "chores")
data class Chore(
    @PrimaryKey val id: Int,
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

class IntListConverter {
    @TypeConverter
    fun fromList(value: List<Int>?): String? = value?.joinToString(",")

    @TypeConverter
    fun toList(value: String?): List<Int>? =
        value?.takeIf { it.isNotEmpty() }?.split(",")?.map { it.toInt() }
            ?: if (value == "") emptyList() else null
}

/**
 * Body for POST /api/chores — matches the route's zod choreSchema
 * (src/app/api/chores/route.ts): omitted fields take server defaults.
 * Gson drops nulls by default, so optional fields stay absent when unset.
 */
data class CreateChoreRequest(
    val title: String,
    val description: String? = null,
    val reminderEnabled: Boolean = true,
    val reminderFrequency: String? = null,
    val activeStartHour: Int? = null,
    val activeEndHour: Int? = null,
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
