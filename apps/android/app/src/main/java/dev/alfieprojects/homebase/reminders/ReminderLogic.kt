package dev.alfieprojects.homebase.reminders

import dev.alfieprojects.homebase.data.model.Chore
import java.time.Instant
import java.time.LocalDate
import java.time.LocalTime
import java.time.ZoneId
import java.time.ZonedDateTime

/**
 * Pure scheduling logic — no Android imports, fully JVM-testable.
 *
 * Semantics ported from the web repo's (deleted, never-wired)
 * src/lib/notifications/chores.ts, now enforced on-device:
 * - reminders only while reminderEnabled && progress < 100
 * - frequency: hourly / every_2_hours / every_3_hours / custom "HH:MM" list
 *   (JSON array); null or unknown frequency → no reminders (web parity)
 * - fires clamp into the [activeStartHour, activeEndHour) window; a
 *   candidate outside the window moves to the next window start
 */
object ReminderLogic {

    /** DB defaults from schema.ts, applied when the API returns null. */
    private const val DEFAULT_START_HOUR = 5
    private const val DEFAULT_END_HOUR = 21

    /**
     * Next reminder for [chore] strictly after [now], as epoch millis,
     * or null if this chore should never remind.
     */
    fun nextReminderAt(chore: Chore, now: Instant, zone: ZoneId): Long? {
        if (chore.reminderEnabled != true) return null
        if (chore.progress >= 100) return null

        val startHour = chore.activeStartHour ?: DEFAULT_START_HOUR
        val endHour = chore.activeEndHour ?: DEFAULT_END_HOUR
        if (startHour >= endHour) return null

        val nowZoned = now.atZone(zone)

        val candidate: ZonedDateTime = when (chore.reminderFrequency) {
            "hourly" -> intervalCandidate(chore, nowZoned, 60)
            "every_2_hours" -> intervalCandidate(chore, nowZoned, 120)
            "every_3_hours" -> intervalCandidate(chore, nowZoned, 180)
            "custom" -> customCandidate(chore, nowZoned) ?: return null
            else -> return null
        }

        return clampToWindow(candidate, startHour, endHour).toInstant().toEpochMilli()
    }

    private fun intervalCandidate(chore: Chore, now: ZonedDateTime, minutes: Long): ZonedDateTime {
        val last = chore.lastReminderSentAt?.let {
            runCatching { Instant.parse(it).atZone(now.zone) }.getOrNull()
        }
        val fromLast = last?.plusMinutes(minutes)
        return if (fromLast != null && fromLast.isAfter(now)) fromLast else now.plusMinutes(1)
    }

    /** Next "HH:MM" from the custom list after now (today or tomorrow). */
    private fun customCandidate(chore: Chore, now: ZonedDateTime): ZonedDateTime? {
        val times = parseCustomTimes(chore.reminderCustomTimes) ?: return null
        if (times.isEmpty()) return null

        val today: LocalDate = now.toLocalDate()
        val todayCandidates = times.map { it.atDate(today).atZone(now.zone) }
        return todayCandidates.firstOrNull { it.isAfter(now) }
            ?: times.first().atDate(today.plusDays(1)).atZone(now.zone)
    }

    /** Parses `["09:00","18:30"]` (JSON array of HH:MM), sorted. */
    fun parseCustomTimes(raw: String?): List<LocalTime>? {
        if (raw.isNullOrBlank()) return null
        val matches = Regex("([01]\\d|2[0-3]):([0-5]\\d)").findAll(raw)
        return matches
            .map { LocalTime.of(it.groupValues[1].toInt(), it.groupValues[2].toInt()) }
            .toList()
            .sorted()
            .takeIf { it.isNotEmpty() }
    }

    private fun clampToWindow(candidate: ZonedDateTime, startHour: Int, endHour: Int): ZonedDateTime =
        when {
            candidate.hour < startHour ->
                candidate.withHour(startHour).withMinute(0).withSecond(0).withNano(0)
            candidate.hour >= endHour ->
                candidate.plusDays(1).withHour(startHour).withMinute(0).withSecond(0).withNano(0)
            else -> candidate
        }
}
