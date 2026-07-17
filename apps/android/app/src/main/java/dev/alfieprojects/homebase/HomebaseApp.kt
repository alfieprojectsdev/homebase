package dev.alfieprojects.homebase

import android.app.Application
import android.app.NotificationChannel
import android.app.NotificationManager
import androidx.work.Constraints
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.NetworkType
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkManager
import dev.alfieprojects.homebase.sync.SyncWorker
import java.util.concurrent.TimeUnit

class HomebaseApp : Application() {
    override fun onCreate() {
        super.onCreate()
        createNotificationChannels()
        enqueuePeriodicSync()
    }

    // Per-category channels (handover requirement) — users can silence
    // completions/streaks without losing reminders.
    private fun createNotificationChannels() {
        val manager = getSystemService(NotificationManager::class.java)
        manager.createNotificationChannels(
            listOf(
                NotificationChannel(
                    CHANNEL_REMINDERS, "Chore reminders",
                    NotificationManager.IMPORTANCE_HIGH,
                ).apply { description = "Aggressive reminders for incomplete chores" },
                NotificationChannel(
                    CHANNEL_COMPLETIONS, "Completions",
                    NotificationManager.IMPORTANCE_DEFAULT,
                ).apply { description = "Someone finished a chore" },
                NotificationChannel(
                    CHANNEL_STREAKS, "Streaks",
                    NotificationManager.IMPORTANCE_DEFAULT,
                ).apply { description = "Streak milestones" },
            )
        )
    }

    private fun enqueuePeriodicSync() {
        val request = PeriodicWorkRequestBuilder<SyncWorker>(15, TimeUnit.MINUTES)
            .setConstraints(
                Constraints.Builder().setRequiredNetworkType(NetworkType.CONNECTED).build()
            )
            .build()
        WorkManager.getInstance(this).enqueueUniquePeriodicWork(
            SyncWorker.PERIODIC_WORK_NAME,
            ExistingPeriodicWorkPolicy.KEEP,
            request,
        )
    }

    companion object {
        const val CHANNEL_REMINDERS = "reminders"
        const val CHANNEL_COMPLETIONS = "completions"
        const val CHANNEL_STREAKS = "streaks"
    }
}
