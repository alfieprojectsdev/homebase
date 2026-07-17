package dev.alfieprojects.homebase

import com.google.gson.Gson
import dev.alfieprojects.homebase.data.model.ChoreListResponse
import dev.alfieprojects.homebase.data.model.ChoreResponse
import dev.alfieprojects.homebase.data.model.LoginResponse
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

/**
 * Parse fixtures captured verbatim from the live Next.js API (2026-07-17
 * dev-server probes) — guards the Kotlin models against drift from the
 * real response shapes.
 */
class ChoreJsonTest {
    private val gson = Gson()

    @Test
    fun `parses chore response from POST api chores`() {
        val json = """
            {"chore":{"id":10,"orgId":226,"residenceId":null,"title":"Audit Chore","description":null,
            "createdBy":226,"assignedTo":null,"progress":25,"progressUnit":"percent","totalSteps":null,
            "completedSteps":0,"steps":null,"isRecurring":false,"recurrencePattern":null,"resetTime":"00:00",
            "reminderEnabled":true,"reminderFrequency":"hourly","reminderCustomTimes":null,
            "activeStartHour":8,"activeEndHour":20,"lastReminderSentAt":null,"completedAt":null,
            "lastProgressUpdateAt":null,"createdAt":"2026-07-16T08:23:13.251Z","updatedAt":"2026-07-16T08:23:13.251Z"}}
        """.trimIndent()

        val chore = gson.fromJson(json, ChoreResponse::class.java).chore
        assertEquals(10, chore.id)
        assertEquals(226, chore.orgId)
        assertEquals("Audit Chore", chore.title)
        assertEquals(25, chore.progress)
        assertEquals(true, chore.reminderEnabled)
        assertEquals("hourly", chore.reminderFrequency)
        assertEquals(8, chore.activeStartHour)
        assertNull(chore.residenceId)
        assertNull(chore.assignedTo)
        assertNull(chore.completedAt)
    }

    @Test
    fun `parses chore list response including empty list`() {
        val empty = gson.fromJson("""{"chores":[]}""", ChoreListResponse::class.java)
        assertTrue(empty.chores.isEmpty())
    }

    @Test
    fun `parses login response from POST api auth login`() {
        val json = """
            {"user":{"id":226,"email":"audit@example.com","name":"Audit User","role":"admin","orgId":226},
            "token":"eyJhbGciOiJIUzI1NiJ9.payload.sig"}
        """.trimIndent()

        val response = gson.fromJson(json, LoginResponse::class.java)
        assertEquals(226, response.user.id)
        assertEquals("admin", response.user.role)
        assertEquals("Audit User", response.user.name)
        assertTrue(response.token.startsWith("eyJ"))
    }
}
