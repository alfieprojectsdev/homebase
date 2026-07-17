package dev.alfieprojects.homebase.ui

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
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import dev.alfieprojects.homebase.data.api.ApiClient
import dev.alfieprojects.homebase.data.api.AuthExpiredException
import dev.alfieprojects.homebase.data.model.Chore
import kotlinx.coroutines.launch

@Composable
fun ChoreListScreen(
    api: ApiClient,
    onAuthExpired: () -> Unit,
    onLogout: () -> Unit,
) {
    var chores by remember { mutableStateOf<List<Chore>?>(null) }
    var error by remember { mutableStateOf<String?>(null) }
    val scope = rememberCoroutineScope()

    suspend fun refresh() {
        try {
            error = null
            chores = api.getChores()
        } catch (e: AuthExpiredException) {
            onAuthExpired()
        } catch (e: Exception) {
            error = "Couldn't load chores — check your connection"
        }
    }

    LaunchedEffect(Unit) { refresh() }

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

        error?.let { Text(it, color = MaterialTheme.colorScheme.error) }

        when (val list = chores) {
            null -> Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                if (error == null) CircularProgressIndicator()
            }
            else -> LazyColumn(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                if (list.isEmpty()) {
                    item { Text("No chores yet", style = MaterialTheme.typography.bodyLarge) }
                }
                items(list, key = { it.id }) { chore ->
                    ChoreCard(chore = chore, onMarkDone = {
                        scope.launch {
                            try {
                                api.updateProgress(chore.id, 100)
                                refresh()
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
