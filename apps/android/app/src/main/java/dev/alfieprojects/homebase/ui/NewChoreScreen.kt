package dev.alfieprojects.homebase.ui

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.selection.selectable
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.RadioButton
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
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
import dev.alfieprojects.homebase.data.model.CreateChoreRequest
import dev.alfieprojects.homebase.reminders.ReminderScheduler
import kotlinx.coroutines.launch

private val FREQUENCY_OPTIONS = listOf(
    null to "No reminders",
    "hourly" to "Every hour",
    "every_2_hours" to "Every 2 hours",
    "every_3_hours" to "Every 3 hours",
)

// ADHD-optimized: one screen, no wizard steps, Create is the single
// prominent action, radio rows are full-width ≥48dp touch targets.
@Composable
fun NewChoreScreen(
    repo: ChoreRepository,
    onCreated: () -> Unit,
    onCancel: () -> Unit,
    onAuthExpired: () -> Unit,
) {
    val context = LocalContext.current
    var title by remember { mutableStateOf("") }
    var description by remember { mutableStateOf("") }
    var frequency by remember { mutableStateOf<String?>(null) }
    var error by remember { mutableStateOf<String?>(null) }
    var busy by remember { mutableStateOf(false) }
    val scope = rememberCoroutineScope()

    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp),
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Text("New Chore", style = MaterialTheme.typography.headlineMedium)
            TextButton(onClick = onCancel, modifier = Modifier.heightIn(min = 48.dp)) {
                Text("Cancel")
            }
        }

        OutlinedTextField(
            value = title,
            onValueChange = { title = it },
            label = { Text("What needs doing?") },
            singleLine = true,
            modifier = Modifier.fillMaxWidth(),
        )

        OutlinedTextField(
            value = description,
            onValueChange = { description = it },
            label = { Text("Details (optional)") },
            minLines = 2,
            modifier = Modifier.fillMaxWidth(),
        )

        Text("Remind me", style = MaterialTheme.typography.titleMedium)
        FREQUENCY_OPTIONS.forEach { (value, label) ->
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .heightIn(min = 48.dp)
                    .selectable(selected = frequency == value, onClick = { frequency = value }),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                RadioButton(selected = frequency == value, onClick = { frequency = value })
                Text(label, style = MaterialTheme.typography.bodyLarge)
            }
        }

        error?.let { Text(it, color = MaterialTheme.colorScheme.error) }

        Button(
            enabled = !busy && title.isNotBlank(),
            onClick = {
                busy = true
                error = null
                scope.launch {
                    try {
                        val created = repo.create(
                            CreateChoreRequest(
                                title = title.trim(),
                                description = description.trim().ifEmpty { null },
                                reminderEnabled = frequency != null,
                                reminderFrequency = frequency,
                            )
                        )
                        ReminderScheduler.scheduleAll(context, listOf(created))
                        onCreated()
                    } catch (e: AuthExpiredException) {
                        onAuthExpired()
                    } catch (e: Exception) {
                        error = "Couldn't create — check your connection and try again"
                        busy = false
                    }
                }
            },
            modifier = Modifier
                .fillMaxWidth()
                .heightIn(min = 48.dp),
        ) {
            if (busy) CircularProgressIndicator(modifier = Modifier.heightIn(max = 24.dp))
            else Text("Create Chore")
        }
    }
}
