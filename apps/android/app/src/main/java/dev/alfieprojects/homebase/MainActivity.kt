package dev.alfieprojects.homebase

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import dev.alfieprojects.homebase.auth.AuthRepository
import dev.alfieprojects.homebase.auth.TokenStore
import dev.alfieprojects.homebase.data.ChoreRepository
import dev.alfieprojects.homebase.data.api.ApiClient
import dev.alfieprojects.homebase.ui.ChoreListScreen
import dev.alfieprojects.homebase.ui.LoginScreen
import dev.alfieprojects.homebase.ui.NewChoreScreen

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        val tokenStore = TokenStore(applicationContext)
        val api = ApiClient(BuildConfig.API_BASE_URL) { tokenStore.token }
        val auth = AuthRepository(api, tokenStore)
        val repo = ChoreRepository(applicationContext, api)

        setContent {
            MaterialTheme {
                Surface(modifier = Modifier.fillMaxSize()) {
                    var loggedIn by remember { mutableStateOf(auth.isLoggedIn) }
                    var addingChore by remember { mutableStateOf(false) }

                    val onAuthExpired = {
                        auth.logout()
                        addingChore = false
                        loggedIn = false
                    }

                    when {
                        !loggedIn -> LoginScreen(auth = auth, onLoggedIn = { loggedIn = true })
                        addingChore -> NewChoreScreen(
                            repo = repo,
                            onCreated = { addingChore = false },
                            onCancel = { addingChore = false },
                            onAuthExpired = onAuthExpired,
                        )
                        else -> ChoreListScreen(
                            repo = repo,
                            onAddChore = { addingChore = true },
                            onAuthExpired = onAuthExpired,
                            onLogout = onAuthExpired,
                        )
                    }
                }
            }
        }
    }
}
