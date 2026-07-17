package dev.alfieprojects.homebase.ui

import android.Manifest
import android.app.AlarmManager
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.os.PowerManager
import android.provider.Settings
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import dev.alfieprojects.homebase.data.ChoreRepository
import dev.alfieprojects.homebase.data.api.AuthExpiredException
import dev.alfieprojects.homebase.data.model.Chore
import dev.alfieprojects.homebase.reminders.ReminderScheduler
import kotlinx.coroutines.launch

@Composable
fun ChoreListScreen(
    repo: ChoreRepository,
    onAddChore: () -> Unit,
    onAuthExpired: () -> Unit,
    onLogout: () -> Unit,
) {
    val context = LocalContext.current
    val chores by repo.chores.collectAsState(initial = null)
    var error by remember { mutableStateOf<String?>(null) }
    var synced by remember { mutableStateOf(false) }
    val scope = rememberCoroutineScope()

    suspend fun sync() {
        try {
            error = null
            repo.fullSync()
            ReminderScheduler.scheduleAll(context, repo.getAll())
            synced = true
        } catch (e: AuthExpiredException) {
            onAuthExpired()
        } catch (e: Exception) {
            error = "Couldn't sync — showing cached chores"
            synced = true
        }
    }

    LaunchedEffect(Unit) { sync() }

    Column(modifier = Modifier.fillMaxSize().padding(16.dp)) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Text("Chores", style = MaterialTheme.typography.headlineMedium)
            TextButton(onClick = onLogout, modifier = Modifier.heightIn(min = 48.dp)) {
                Text("Log out")
            }
        }

        // ADHD rule: Add Chore is a primary action — prominent, never hidden.
        Button(
            onClick = onAddChore,
            modifier = Modifier.fillMaxWidth().heightIn(min = 48.dp).padding(vertical = 4.dp),
        ) {
            Text("+ Add Chore")
        }

        NotificationPermissionBanner()
        ReliabilityBanners()

        error?.let { Text(it, color = MaterialTheme.colorScheme.error) }

        when (val list = chores) {
            null -> Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                CircularProgressIndicator()
            }
            else -> {
                if (list.isEmpty() && !synced) {
                    Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                        CircularProgressIndicator()
                    }
                } else {
                    LazyColumn(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                        if (list.isEmpty()) {
                            item { Text("No chores yet", style = MaterialTheme.typography.bodyLarge) }
                        }
                        items(list, key = { it.id }) { chore ->
                            ChoreCard(chore = chore, onMarkDone = {
                                scope.launch {
                                    try {
                                        repo.markDone(chore.id)
                                        ReminderScheduler.cancel(context, chore.id)
                                    } catch (e: AuthExpiredException) {
                                        onAuthExpired()
                                    } catch (e: Exception) {
                                        error = "Couldn't update — try again"
                                    }
                                }
                            })
                        }
                    }
                }
            }
        }
    }
}

/** API 33+: POST_NOTIFICATIONS is a runtime permission — request up front. */
@Composable
private fun NotificationPermissionBanner() {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU) return
    val context = LocalContext.current
    var granted by remember {
        mutableStateOf(
            context.checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) ==
                PackageManager.PERMISSION_GRANTED
        )
    }
    if (granted) return

    val launcher = rememberLauncherForActivityResult(
        ActivityResultContracts.RequestPermission()
    ) { granted = it }

    LaunchedEffect(Unit) { launcher.launch(Manifest.permission.POST_NOTIFICATIONS) }
}

/**
 * The two settings that make-or-break reminder delivery on One UI
 * (handover: app sleeper is the top notification-drop cause on the A07):
 * battery-optimization exemption + exact-alarm permission.
 */
@Composable
private fun ReliabilityBanners() {
    val context = LocalContext.current
    val powerManager = context.getSystemService(Context.POWER_SERVICE) as PowerManager
    val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager

    var ignoringBattery by remember {
        mutableStateOf(powerManager.isIgnoringBatteryOptimizations(context.packageName))
    }
    var exactAllowed by remember {
        mutableStateOf(ReminderScheduler.canUseExact(alarmManager))
    }

    if (!ignoringBattery) {
        SettingsBanner(
            text = "Reminders can be killed by battery optimization — allow Homebase to run unrestricted",
            buttonLabel = "Fix now",
        ) {
            @Suppress("BatteryLife")
            context.startActivity(
                Intent(
                    Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS,
                    Uri.parse("package:${context.packageName}"),
                )
            )
            ignoringBattery = powerManager.isIgnoringBatteryOptimizations(context.packageName)
        }
    }

    if (!exactAllowed && Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
        SettingsBanner(
            text = "Exact reminder timing needs the Alarms permission",
            buttonLabel = "Allow",
        ) {
            context.startActivity(
                Intent(
                    Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM,
                    Uri.parse("package:${context.packageName}"),
                )
            )
            exactAllowed = ReminderScheduler.canUseExact(alarmManager)
        }
    }
}

@Composable
private fun SettingsBanner(text: String, buttonLabel: String, onClick: () -> Unit) {
    Card(modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp)) {
        Column(modifier = Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Text(text, style = MaterialTheme.typography.bodyMedium)
            Button(onClick = onClick, modifier = Modifier.heightIn(min = 48.dp)) {
                Text(buttonLabel)
            }
        }
    }
}

// ADHD-optimized: Mark Done is prominent, never hidden behind a menu;
// progress shown as bar + text (not color alone).
@Composable
private fun ChoreCard(chore: Chore, onMarkDone: () -> Unit) {
    val done = chore.progress >= 100
    Card(modifier = Modifier.fillMaxWidth()) {
        Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Text(chore.title, style = MaterialTheme.typography.titleLarge)
            chore.description?.takeIf { it.isNotBlank() }?.let {
                Text(it, style = MaterialTheme.typography.bodyMedium)
            }
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                LinearProgressIndicator(
                    progress = { chore.progress / 100f },
                    modifier = Modifier.weight(1f),
                )
                Text("${chore.progress}%", style = MaterialTheme.typography.labelLarge)
            }
            if (!done) {
                Button(
                    onClick = onMarkDone,
                    modifier = Modifier.fillMaxWidth().heightIn(min = 48.dp),
                ) {
                    Text("Mark Done")
                }
            } else {
                Text("✓ Done", style = MaterialTheme.typography.titleMedium)
            }
        }
    }
}
