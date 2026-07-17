package dev.alfieprojects.homebase.data

import android.content.Context
import dev.alfieprojects.homebase.data.api.ApiClient
import dev.alfieprojects.homebase.data.db.AppDatabase
import dev.alfieprojects.homebase.data.model.Chore
import kotlinx.coroutines.flow.Flow
import java.time.Instant

/**
 * Single source of truth = Room. The API is only ever a sync source:
 * - full sync (app open): replace-all — the only way deletions propagate
 * - delta sync (background): GET /api/chores?updatedSince=<last sync>
 *
 * Reminder scheduling reads from Room, never from the network — a dropped
 * sync only ever costs staleness, never a lost reminder (handover
 * requirement).
 */
class ChoreRepository(
    context: Context,
    private val api: ApiClient,
) {
    private val dao = AppDatabase.get(context).choreDao()
    private val prefs = context.getSharedPreferences("homebase_sync", Context.MODE_PRIVATE)

    val chores: Flow<List<Chore>> = dao.observeAll()

    suspend fun getAll(): List<Chore> = dao.getAll()

    suspend fun fullSync() {
        val started = Instant.now().toString()
        val remote = api.getChores()
        dao.upsertAll(remote)
        if (remote.isEmpty()) dao.clear() else dao.deleteAbsent(remote.map { it.id })
        prefs.edit().putString(KEY_LAST_SYNC, started).apply()
    }

    suspend fun deltaSync() {
        val since = prefs.getString(KEY_LAST_SYNC, null)
        if (since == null) {
            fullSync()
            return
        }
        val started = Instant.now().toString()
        val changed = api.getChores(updatedSince = since)
        if (changed.isNotEmpty()) dao.upsertAll(changed)
        prefs.edit().putString(KEY_LAST_SYNC, started).apply()
    }

    suspend fun markDone(choreId: Int) {
        val updated = api.updateProgress(choreId, 100)
        dao.upsertAll(listOf(updated))
    }

    private companion object {
        const val KEY_LAST_SYNC = "last_sync_at"
    }
}
