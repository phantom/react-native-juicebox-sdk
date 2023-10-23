package xyz.juicebox.demo

import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.Promise
import com.google.android.gms.auth.blockstore.Blockstore
import com.google.android.gms.auth.blockstore.RetrieveBytesRequest
import com.google.android.gms.auth.blockstore.StoreBytesData

class SecretIdStorageModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    override fun getName() = NAME

    @ReactMethod
    fun register(secretId: String, promise: Promise) {
        val client = Blockstore.getClient(reactApplicationContext)
        val storeRequest = StoreBytesData.Builder()
            // TODO: Check if cloud backup is available and fallback to GDrive
            .setShouldBackupToCloud(true)
            .setBytes(secretId.toByteArray())
            .setKey(SECRET_ID_BYTES_KEY)
            .build()
        client.storeBytes(storeRequest).addOnSuccessListener {
            promise.resolve(null)
        }.addOnFailureListener {
            promise.reject("0", "failed $it", it)
        }
    }

    @ReactMethod
    fun recover(promise: Promise) {
        val client = Blockstore.getClient(reactApplicationContext)
        val retrieveRequest = RetrieveBytesRequest.Builder()
            .setKeys(arrayListOf(SECRET_ID_BYTES_KEY))
            .build()
        client.retrieveBytes(retrieveRequest).addOnSuccessListener {
            val secretIdBytes = it.blockstoreDataMap[SECRET_ID_BYTES_KEY]?.bytes
                ?: return@addOnSuccessListener promise.reject("0", "not found")
            promise.resolve(String(secretIdBytes))
        }.addOnFailureListener {
            promise.reject("0", "failed $it", it)
        }
    }

    companion object {
        const val NAME = "SecretIdStorage"
        const val SECRET_ID_BYTES_KEY = "xyz.juicebox.demo.jbid"
    }
}
