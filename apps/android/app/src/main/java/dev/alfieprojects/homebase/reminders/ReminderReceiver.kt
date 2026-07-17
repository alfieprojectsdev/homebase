package dev.alfieprojects.homebase.reminders

import android.Manifest
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import dev.alfieprojects.homebase.HomebaseApp
import dev.alfieprojects.homebase.MainActivity
import dev.alfieprojects.homebase.R
import dev.alfieprojects.homebase.data.db.AppDatabase
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import java.time.Instant

/**
 * Fires the reminder notification, then chains: bumps the local
 * lastReminderSentAt and schedules this chore's next occurrence. All
 * from Room — zero network at fire time (handover requirement).
 */
class ReminderReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        val choreId = intent.getIntExtra(EXTRA_CHORE_ID, -1)
        if (choreId == -1) return
        val title = intent.getStringExtra(EXTRA_TITLE) ?: "Chore reminder"
        val progress = intent.getIntExtra(EXTRA_PROGRESS, 0)

        showNotification(context, choreId, title, progress)

        // Chain the next occurrence off the just-fired one.
        val pending = goAsync()
        CoroutineScope(Dispatchers.IO).launch {
            try {
                val dao = AppDatabase.get(context).choreDao()
                val chore = dao.getById(choreId) ?: return@launch
                val updated = chore.copy(lastReminderSentAt = Instant.now().toString())
                dao.upsertAll(listOf(updated))
                ReminderScheduler.scheduleAll(context, listOf(updated))
            } finally {
                pending.finish()
            }
        }
    }

    private fun showNotification(context: Context, choreId: Int, title: String, progress: Int) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU &&
            context.checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED
        ) return

        val tapIntent = PendingIntent.getActivity(
            context, choreId,
            Intent(context, MainActivity::class.java),
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
        )

        val notification = NotificationCompat.Builder(context, HomebaseApp.CHANNEL_REMINDERS)
            .setSmallIcon(R.drawable.ic_notification)
            .setContentTitle(title)
            .setContentText("$progress% complete — don't forget to finish!")
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setCategory(NotificationCompat.CATEGORY_REMINDER)
            .setContentIntent(tapIntent)
            .setAutoCancel(true)
            .build()

        NotificationManagerCompat.from(context).notify(choreId, notification)
    }

    companion object {
        const val EXTRA_CHORE_ID = "chore_id"
        const val EXTRA_TITLE = "title"
        const val EXTRA_PROGRESS = "progress"
    }
}
