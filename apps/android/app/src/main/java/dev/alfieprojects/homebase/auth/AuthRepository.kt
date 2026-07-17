package dev.alfieprojects.homebase.auth

import dev.alfieprojects.homebase.data.api.ApiClient
import dev.alfieprojects.homebase.data.model.SignupRequest

class AuthRepository(
    private val api: ApiClient,
    private val tokenStore: TokenStore,
) {
    val isLoggedIn: Boolean get() = tokenStore.token != null

    suspend fun login(usernameOrEmail: String, password: String) {
        val response = api.login(toEmail(usernameOrEmail), password)
        tokenStore.token = response.token
        tokenStore.userName = response.user.name
        tokenStore.userId = response.user.id
    }

    suspend fun signup(username: String, householdName: String, password: String) {
        val response = api.signup(
            SignupRequest(
                name = username.trim(),
                orgName = householdName.trim(),
                email = toEmail(username),
                password = password,
            )
        )
        tokenStore.token = response.token
        tokenStore.userName = response.user.name
        tokenStore.userId = response.user.id
    }

    fun logout() = tokenStore.clear()

    companion object {
        /**
         * Bootstrap auth (owner decision 2026-07-17): usernames, not emails,
         * no verification — proper auth later. The server requires an
         * email-shaped unique string, so plain usernames become
         * <username>@homebase.local; anything already containing '@' is
         * passed through as a real email. Applied identically at login and
         * signup so accounts round-trip.
         */
        fun toEmail(usernameOrEmail: String): String {
            val trimmed = usernameOrEmail.trim().lowercase()
            return if ("@" in trimmed) trimmed else "$trimmed@homebase.local"
        }
    }
}
