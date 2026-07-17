package dev.alfieprojects.homebase.ui

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
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
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.unit.dp
import dev.alfieprojects.homebase.auth.AuthRepository
import kotlinx.coroutines.launch

// ADHD-optimized: single obvious action per mode, large touch targets
// (≥48dp), errors as text not color alone. Bootstrap auth: username-based
// (synthesized email under the hood), no verification — see AuthRepository.
@Composable
fun LoginScreen(auth: AuthRepository, onLoggedIn: () -> Unit) {
    var creatingAccount by remember { mutableStateOf(false) }
    var username by remember { mutableStateOf("") }
    var householdName by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    var error by remember { mutableStateOf<String?>(null) }
    var busy by remember { mutableStateOf(false) }
    val scope = rememberCoroutineScope()

    val formValid = username.isNotBlank() && password.isNotBlank() &&
        (!creatingAccount || householdName.isNotBlank())

    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(24.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp, Alignment.CenterVertically),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Text("Homebase", style = MaterialTheme.typography.headlineLarge)
        Text(
            if (creatingAccount) "Create your household account" else "Welcome back",
            style = MaterialTheme.typography.bodyLarge,
        )

        OutlinedTextField(
            value = username,
            onValueChange = { username = it },
            label = { Text("Username") },
            singleLine = true,
            modifier = Modifier.fillMaxWidth(),
        )

        if (creatingAccount) {
            OutlinedTextField(
                value = householdName,
                onValueChange = { householdName = it },
                label = { Text("Household name (e.g. Dela Cruz Home)") },
                singleLine = true,
                modifier = Modifier.fillMaxWidth(),
            )
        }

        OutlinedTextField(
            value = password,
            onValueChange = { password = it },
            label = { Text(if (creatingAccount) "Password (8+ characters)" else "Password") },
            singleLine = true,
            visualTransformation = PasswordVisualTransformation(),
            modifier = Modifier.fillMaxWidth(),
        )

        error?.let {
            Text(it, color = MaterialTheme.colorScheme.error)
        }

        Button(
            enabled = !busy && formValid,
            onClick = {
                if (creatingAccount && password.length < 8) {
                    error = "Password needs at least 8 characters"
                    return@Button
                }
                busy = true
                error = null
                scope.launch {
                    try {
                        if (creatingAccount) {
                            auth.signup(username, householdName, password)
                        } else {
                            auth.login(username, password)
                        }
                        onLoggedIn()
                    } catch (e: Exception) {
                        error = when {
                            e.message?.contains("409") == true ->
                                "That username is taken — pick another"
                            e.message?.contains("401") == true || e.message == "Authentication expired" ->
                                "Wrong username or password"
                            e.message?.contains("400") == true ->
                                "Check the fields and try again"
                            else -> "Couldn't reach the server — check your connection"
                        }
                    } finally {
                        busy = false
                    }
                }
            },
            modifier = Modifier
                .fillMaxWidth()
                .heightIn(min = 48.dp),
        ) {
            if (busy) CircularProgressIndicator(modifier = Modifier.heightIn(max = 24.dp))
            else Text(if (creatingAccount) "Create account" else "Log in")
        }

        TextButton(
            onClick = {
                creatingAccount = !creatingAccount
                error = null
            },
            modifier = Modifier.heightIn(min = 48.dp),
        ) {
            Text(
                if (creatingAccount) "Have an account? Log in"
                else "New here? Create an account"
            )
        }
    }
}
