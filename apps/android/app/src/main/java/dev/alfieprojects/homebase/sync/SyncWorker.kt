package dev.alfieprojects.homebase.sync

import android.content.Context
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters
import dev.alfieprojects.homebase.BuildConfig
import dev.alfieprojects.homebase.auth.TokenStore
import dev.alfieprojects.homebase.data.ChoreRepository
import dev.alfieprojects.homebase.data.api.ApiClient
import dev.alfieprojects.homebase.data.api.AuthExpiredException
import dev.alfieprojects.homebase.reminders.ReminderScheduler

/**
 * Background delta pull (Neon via the Next.js API — no Firebase; owner
 * preference 2026-07-17). WorkManager's 15-min periodic floor bounds
 * worst-case staleness for server-side changes; reminders themselves fire
 * from the local schedule regardless of sync health.
 */
class SyncWorker(
    context: Context,
    params: WorkerParameters,
) : CoroutineWorker(context, params) {

    override suspend fun doWork(): Result {
        val tokenStore = TokenStore(applicationContext)
        if (tokenStore.token == null) return Result.success() // logged out — nothing to sync

        val api = ApiClient(BuildConfig.API_BASE_URL) { tokenStore.token }
        val repo = ChoreRepository(applicationContext, api)

        return try {
            repo.deltaSync()
            ReminderScheduler.scheduleAll(applicationContext, repo.getAll())
            Result.success()
        } catch (e: AuthExpiredException) {
            Result.success() // token expired — user will re-login in app; don't retry-loop
        } catch (e: Exception) {
            Result.retry()
        }
    }

    companion object {
        const val PERIODIC_WORK_NAME = "chore-delta-sync"
    }
}
