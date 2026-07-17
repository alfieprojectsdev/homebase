package dev.alfieprojects.homebase.auth

import dev.alfieprojects.homebase.data.api.ApiClient

class AuthRepository(
    private val api: ApiClient,
    private val tokenStore: TokenStore,
) {
    val isLoggedIn: Boolean get() = tokenStore.token != null

    suspend fun login(email: String, password: String) {
        val response = api.login(email, password)
        tokenStore.token = response.token
        tokenStore.userName = response.user.name
        tokenStore.userId = response.user.id
    }

    fun logout() = tokenStore.clear()
}
