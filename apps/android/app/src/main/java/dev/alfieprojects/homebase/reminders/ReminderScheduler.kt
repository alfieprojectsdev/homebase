package dev.alfieprojects.homebase.reminders

import android.app.AlarmManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build
import dev.alfieprojects.homebase.data.model.Chore
import java.time.Instant
import java.time.ZoneId

/**
 * Wires ReminderLogic to AlarmManager. One alarm per chore (request code =
 * chore id). Exact-and-allow-while-idle where permitted — the whole point
 * of going native (survives Doze) — falling back to inexact when the
 * exact-alarm permission is missing (API 33+ requires the user to grant it).
 */
object ReminderScheduler {

    fun scheduleAll(context: Context, chores: List<Chore>) {
        val now = Instant.now()
        val zone = ZoneId.systemDefault()
        for (chore in chores) {
            val at = ReminderLogic.nextReminderAt(chore, now, zone)
            if (at == null) cancel(context, chore.id) else schedule(context, chore, at)
        }
    }

    fun schedule(context: Context, chore: Chore, triggerAtMillis: Long) {
        val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
        val pi = pendingIntent(context, chore)
        if (canUseExact(alarmManager)) {
            alarmManager.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerAtMillis, pi)
        } else {
            alarmManager.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerAtMillis, pi)
        }
    }

    fun cancel(context: Context, choreId: Int) {
        val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
        alarmManager.cancel(
            PendingIntent.getBroadcast(
                context, choreId,
                Intent(context, ReminderReceiver::class.java),
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
            )
        )
    }

    fun canUseExact(alarmManager: AlarmManager): Boolean =
        Build.VERSION.SDK_INT < Build.VERSION_CODES.S || alarmManager.canScheduleExactAlarms()

    private fun pendingIntent(context: Context, chore: Chore): PendingIntent {
        val intent = Intent(context, ReminderReceiver::class.java).apply {
            putExtra(ReminderReceiver.EXTRA_CHORE_ID, chore.id)
            putExtra(ReminderReceiver.EXTRA_TITLE, chore.title)
            putExtra(ReminderReceiver.EXTRA_PROGRESS, chore.progress)
        }
        return PendingIntent.getBroadcast(
            context, chore.id, intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
        )
    }
}
