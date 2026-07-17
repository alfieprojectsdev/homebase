package dev.alfieprojects.homebase

import dev.alfieprojects.homebase.data.model.Chore
import dev.alfieprojects.homebase.reminders.ReminderLogic
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test
import java.time.Instant
import java.time.LocalTime
import java.time.ZoneId
import java.time.ZonedDateTime

class ReminderLogicTest {
    private val zone = ZoneId.of("Asia/Manila")

    private fun chore(
        progress: Int = 25,
        reminderEnabled: Boolean? = true,
        reminderFrequency: String? = "hourly",
        reminderCustomTimes: String? = null,
        activeStartHour: Int? = 8,
        activeEndHour: Int? = 20,
        lastReminderSentAt: String? = null,
    ) = Chore(
        id = 1, orgId = 1, residenceId = null, title = "Test", description = null,
        createdBy = 1, assignedTo = null, progress = progress, progressUnit = "percent",
        totalSteps = null, completedSteps = 0, steps = null, isRecurring = false,
        recurrencePattern = null, resetTime = "00:00", reminderEnabled = reminderEnabled,
        reminderFrequency = reminderFrequency, reminderCustomTimes = reminderCustomTimes,
        activeStartHour = activeStartHour, activeEndHour = activeEndHour,
        lastReminderSentAt = lastReminderSentAt, completedAt = null,
        lastProgressUpdateAt = null, createdAt = "2026-07-17T00:00:00.000Z",
        updatedAt = "2026-07-17T00:00:00.000Z",
    )

    private fun at(hour: Int, minute: Int = 0): Instant =
        ZonedDateTime.of(2026, 7, 17, hour, minute, 0, 0, zone).toInstant()

    private fun zdt(millis: Long): ZonedDateTime =
        Instant.ofEpochMilli(millis).atZone(zone)

    @Test
    fun `no reminder when disabled`() {
        assertNull(ReminderLogic.nextReminderAt(chore(reminderEnabled = false), at(10), zone))
    }

    @Test
    fun `no reminder when complete`() {
        assertNull(ReminderLogic.nextReminderAt(chore(progress = 100), at(10), zone))
    }

    @Test
    fun `no reminder when frequency null — web parity`() {
        assertNull(ReminderLogic.nextReminderAt(chore(reminderFrequency = null), at(10), zone))
    }

    @Test
    fun `hourly with no prior reminder fires within a minute inside window`() {
        val next = ReminderLogic.nextReminderAt(chore(), at(10), zone)!!
        assertEquals(10, zdt(next).hour)
        assertEquals(1, zdt(next).minute)
    }

    @Test
    fun `hourly chains one hour after last reminder`() {
        val last = at(10).toString()
        val next = ReminderLogic.nextReminderAt(chore(lastReminderSentAt = last), at(10, 5), zone)!!
        assertEquals(11, zdt(next).hour)
        assertEquals(0, zdt(next).minute)
    }

    @Test
    fun `candidate before window start clamps to window start`() {
        val next = ReminderLogic.nextReminderAt(chore(), at(6), zone)!!
        assertEquals(8, zdt(next).hour)
        assertEquals(0, zdt(next).minute)
    }

    @Test
    fun `candidate after window end moves to next day window start`() {
        val next = ReminderLogic.nextReminderAt(chore(), at(21), zone)!!
        val z = zdt(next)
        assertEquals(18, z.dayOfMonth)
        assertEquals(8, z.hour)
    }

    @Test
    fun `custom times pick next slot today`() {
        val c = chore(reminderFrequency = "custom", reminderCustomTimes = """["09:00","18:30"]""")
        val next = ReminderLogic.nextReminderAt(c, at(10), zone)!!
        assertEquals(18, zdt(next).hour)
        assertEquals(30, zdt(next).minute)
    }

    @Test
    fun `custom times roll to tomorrow when all past`() {
        val c = chore(reminderFrequency = "custom", reminderCustomTimes = """["09:00"]""")
        val next = ReminderLogic.nextReminderAt(c, at(19), zone)!!
        val z = zdt(next)
        assertEquals(18, z.dayOfMonth)
        assertEquals(9, z.hour)
    }

    @Test
    fun `custom frequency with no times gives no reminder`() {
        val c = chore(reminderFrequency = "custom", reminderCustomTimes = null)
        assertNull(ReminderLogic.nextReminderAt(c, at(10), zone))
    }

    @Test
    fun `null window hours use schema defaults 5 to 21`() {
        val c = chore(activeStartHour = null, activeEndHour = null)
        val next = ReminderLogic.nextReminderAt(c, at(3), zone)!!
        assertEquals(5, zdt(next).hour)
    }

    @Test
    fun `parses custom times json`() {
        assertEquals(
            listOf(LocalTime.of(9, 0), LocalTime.of(18, 30)),
            ReminderLogic.parseCustomTimes("""["18:30","09:00"]"""),
        )
        assertNull(ReminderLogic.parseCustomTimes(null))
        assertNull(ReminderLogic.parseCustomTimes("[]"))
    }
}
