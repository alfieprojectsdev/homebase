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
import dev.alfieprojects.homebase.data.api.ApiClient
import dev.alfieprojects.homebase.ui.ChoreListScreen
import dev.alfieprojects.homebase.ui.LoginScreen

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        val tokenStore = TokenStore(applicationContext)
        val api = ApiClient(BuildConfig.API_BASE_URL) { tokenStore.token }
        val auth = AuthRepository(api, tokenStore)

        setContent {
            MaterialTheme {
                Surface(modifier = Modifier.fillMaxSize()) {
                    var loggedIn by remember { mutableStateOf(auth.isLoggedIn) }


                    if (loggedIn) {
                        ChoreListScreen(
                            api = api,
                            onAuthExpired = {
                                auth.logout()
                                loggedIn = false
                            },
                            onLogout = {
                                auth.logout()
                                loggedIn = false
                            },
                        )
                    } else {
                        LoginScreen(auth = auth, onLoggedIn = { loggedIn = true })
                    }
                }
            }
        }
    }
}
