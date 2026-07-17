package dev.alfieprojects.homebase

import dev.alfieprojects.homebase.auth.AuthRepository
import org.junit.Assert.assertEquals
import org.junit.Test

class AuthEmailTest {
    @Test
    fun `plain username synthesizes local email`() {
        assertEquals("alfie@homebase.local", AuthRepository.toEmail("alfie"))
    }

    @Test
    fun `normalizes case and whitespace`() {
        assertEquals("alfie@homebase.local", AuthRepository.toEmail("  Alfie "))
    }

    @Test
    fun `real email passes through`() {
        assertEquals("a@b.com", AuthRepository.toEmail("A@b.com"))
    }

    @Test
    fun `synthesized email passes the server signup regex`() {
        val serverRegex = Regex("^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$")
        assertEquals(true, serverRegex.matches(AuthRepository.toEmail("mom")))
    }
}
