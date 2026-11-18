package com.example.cftbuses

import android.content.Context
import android.util.Base64
import android.webkit.JavascriptInterface
import java.nio.ByteBuffer
import java.security.KeyStore
import javax.crypto.Cipher
import javax.crypto.KeyGenerator
import javax.crypto.SecretKey
import javax.crypto.spec.GCMParameterSpec
import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyProperties

/** Encrypted bridge for the PWA's small local settings and session data. */
class EncryptedWebStorage(context: Context) {
    private val prefs = context.getSharedPreferences("buscftla_encrypted_store", Context.MODE_PRIVATE)

    @JavascriptInterface
    fun getItem(key: String): String? {
        if (!validKey(key)) return null
        val packed = prefs.getString(key, null) ?: return null
        return try {
            val bytes = Base64.decode(packed, Base64.NO_WRAP)
            val buffer = ByteBuffer.wrap(bytes)
            val iv = ByteArray(buffer.getInt())
            buffer.get(iv)
            val encrypted = ByteArray(buffer.remaining())
            buffer.get(encrypted)
            val cipher = Cipher.getInstance("AES/GCM/NoPadding")
            cipher.init(Cipher.DECRYPT_MODE, getOrCreateKey(), GCMParameterSpec(128, iv))
            String(cipher.doFinal(encrypted), Charsets.UTF_8)
        } catch (_: Exception) {
            null
        }
    }

    @JavascriptInterface
    fun setItem(key: String, value: String): Boolean {
        if (!validKey(key) || value.length > 131072) return false
        return try {
            val cipher = Cipher.getInstance("AES/GCM/NoPadding")
            cipher.init(Cipher.ENCRYPT_MODE, getOrCreateKey())
            val encrypted = cipher.doFinal(value.toByteArray(Charsets.UTF_8))
            val packed = ByteBuffer.allocate(4 + cipher.iv.size + encrypted.size)
                .putInt(cipher.iv.size).put(cipher.iv).put(encrypted).array()
            prefs.edit().putString(key, Base64.encodeToString(packed, Base64.NO_WRAP)).apply()
            true
        } catch (_: Exception) {
            // Do not write the clear-text value if encryption fails.
            false
        }
    }

    @JavascriptInterface
    fun removeItem(key: String) {
        if (validKey(key)) prefs.edit().remove(key).apply()
    }

    private fun validKey(key: String): Boolean = key.matches(Regex("buscftla_[a-zA-Z0-9_]{1,80}"))

    private fun getOrCreateKey(): SecretKey {
        val keyStore = KeyStore.getInstance("AndroidKeyStore").apply { load(null) }
        (keyStore.getKey(KEY_ALIAS, null) as? SecretKey)?.let { return it }
        val generator = KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, "AndroidKeyStore")
        generator.init(
            KeyGenParameterSpec.Builder(
                KEY_ALIAS,
                KeyProperties.PURPOSE_ENCRYPT or KeyProperties.PURPOSE_DECRYPT
            ).setBlockModes(KeyProperties.BLOCK_MODE_GCM)
                .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
                .setKeySize(256)
                .build()
        )
        return generator.generateKey()
    }

    companion object {
        private const val KEY_ALIAS = "buscftla_local_data_v1"
    }
}
