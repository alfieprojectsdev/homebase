package dev.alfieprojects.homebase.reminders

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import dev.alfieprojects.homebase.data.db.AppDatabase
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch

/**
 * Alarms don't survive reboot — reschedule everything from the Room cache.
 * No network involved; a reboot only costs whatever staleness the cache had.
 */
class BootReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action != Intent.ACTION_BOOT_COMPLETED) return
        val pending = goAsync()
        CoroutineScope(Dispatchers.IO).launch {
            try {
                val chores = AppDatabase.get(context).choreDao().getAll()
                ReminderScheduler.scheduleAll(context, chores)
            } finally {
                pending.finish()
            }
        }
    }
}
