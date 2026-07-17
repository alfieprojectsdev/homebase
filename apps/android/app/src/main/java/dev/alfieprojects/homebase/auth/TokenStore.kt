package dev.alfieprojects.homebase.auth

import android.content.Context
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKey

/**
 * Encrypted-at-rest JWT + user identity storage (AES256, Android Keystore).
 * The JWT expires after 7 days (web repo src/lib/auth/jwt.ts); a 401 from
 * the API routes the user back to login rather than attempting refresh —
 * there is no refresh endpoint.
 */
class TokenStore(context: Context) {
    private val prefs = EncryptedSharedPreferences.create(
        context,
        "homebase_auth",
        MasterKey.Builder(context).setKeyScheme(MasterKey.KeyScheme.AES256_GCM).build(),
        EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
        EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM,
    )

    var token: String?
        get() = prefs.getString(KEY_TOKEN, null)
        set(value) = prefs.edit().putString(KEY_TOKEN, value).apply()

    var userName: String?
        get() = prefs.getString(KEY_USER_NAME, null)
        set(value) = prefs.edit().putString(KEY_USER_NAME, value).apply()

    var userId: Int
        get() = prefs.getInt(KEY_USER_ID, -1)
        set(value) = prefs.edit().putInt(KEY_USER_ID, value).apply()

    fun clear() = prefs.edit().clear().apply()

    private companion object {
        const val KEY_TOKEN = "token"
        const val KEY_USER_NAME = "user_name"
        const val KEY_USER_ID = "user_id"
    }
}
