package dev.alfieprojects.homebase.data.api

import com.google.gson.Gson
import dev.alfieprojects.homebase.data.model.Chore
import dev.alfieprojects.homebase.data.model.ChoreListResponse
import dev.alfieprojects.homebase.data.model.ChoreResponse
import dev.alfieprojects.homebase.data.model.LoginRequest
import dev.alfieprojects.homebase.data.model.LoginResponse
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import java.util.concurrent.TimeUnit

class ApiException(val code: Int, message: String) : Exception(message)

/** 401 — token missing/expired; caller should route to login. */
class AuthExpiredException : Exception("Authentication expired")

/**
 * Thin client for the Next.js API. Mobile transport is `Authorization:
 * Bearer <jwt>` (web uses httpOnly cookies) — see src/lib/auth/server.ts
 * in the web repo.
 */
class ApiClient(
    private val baseUrl: String,
    private val tokenProvider: () -> String?,
) {
    private val gson = Gson()
    private val json = "application/json; charset=utf-8".toMediaType()
    private val http = OkHttpClient.Builder()
        .connectTimeout(10, TimeUnit.SECONDS)
        .readTimeout(20, TimeUnit.SECONDS)
        .build()

    suspend fun login(email: String, password: String): LoginResponse =
        post("/api/auth/login", LoginRequest(email, password), authenticated = false)

    suspend fun getChores(updatedSince: String? = null): List<Chore> {
        val query = if (updatedSince != null) "?updatedSince=$updatedSince" else ""
        return get<ChoreListResponse>("/api/chores$query").chores
    }

    suspend fun updateProgress(choreId: Int, progress: Int): Chore =
        patch<ChoreResponse>("/api/chores/$choreId", mapOf("progress" to progress)).chore

    private suspend inline fun <reified T> get(path: String): T =
        execute(builder(path).get().build())

    private suspend inline fun <reified T> post(path: String, body: Any, authenticated: Boolean = true): T =
        execute(builder(path, authenticated).post(gson.toJson(body).toRequestBody(json)).build())

    private suspend inline fun <reified T> patch(path: String, body: Any): T =
        execute(builder(path).patch(gson.toJson(body).toRequestBody(json)).build())

    private fun builder(path: String, authenticated: Boolean = true): Request.Builder {
        val b = Request.Builder().url(baseUrl + path)
        if (authenticated) {
            val token = tokenProvider() ?: throw AuthExpiredException()
            b.header("Authorization", "Bearer $token")
        }
        return b
    }

    private suspend inline fun <reified T> execute(request: Request): T =
        withContext(Dispatchers.IO) {
            http.newCall(request).execute().use { response ->
                val bodyText = response.body?.string() ?: ""
                when {
                    response.isSuccessful -> gson.fromJson(bodyText, T::class.java)
                    response.code == 401 -> throw AuthExpiredException()
                    else -> throw ApiException(response.code, "HTTP ${response.code}: $bodyText")
                }
            }
        }
}
