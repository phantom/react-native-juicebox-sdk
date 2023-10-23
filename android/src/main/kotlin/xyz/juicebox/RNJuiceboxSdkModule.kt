package xyz.juicebox

import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReadableArray
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.bridge.WritableMap
import kotlinx.coroutines.runBlocking
import xyz.juicebox.sdk.*

class RNJuiceboxSdkModule(reactContext: ReactApplicationContext) :
  ReactContextBaseJavaModule(reactContext) {

  override fun getName(): String {
    return NAME
  }

  @ReactMethod
  fun register(
    configuration: String,
    authentication: ReadableMap,
    pin: ReadableArray,
    secret: ReadableArray,
    info: ReadableArray,
    numGuesses: Int,
    promise: Promise
  ) {
    val authentication = authentication
      .toHashMap()
      .mapKeys {RealmId(string = it.key) }
      .mapValues { AuthToken(it.value.toString()) }

    val client = Client(configuration = Configuration(json = configuration), authTokens = authentication)
    runBlocking {
      try {
        client.register(
          pin.toByteArray(),
          secret.toByteArray(),
          info.toByteArray(),
          numGuesses.toShort()
        )
        promise.resolve(null)
      } catch (e: RegisterException) {
        promise.reject(e.error.toString(), e)
      } catch (e: Throwable) {
        promise.reject(e)
      }
    }
  }

  @ReactMethod
  fun recover(
    configuration: String,
    authentication: ReadableMap,
    pin: ReadableArray,
    info: ReadableArray,
    promise: Promise
  ) {
    val authentication = authentication
      .toHashMap()
      .mapKeys {RealmId(string = it.key) }
      .mapValues { AuthToken(it.value.toString()) }

    val client = Client(configuration = Configuration(json = configuration), authTokens = authentication)
    runBlocking {
      try {
        val secret = client.recover(
          pin.toByteArray(),
          info.toByteArray()
        )
        promise.resolve(Arguments.fromArray(secret.map { it.toDouble() }.toDoubleArray()))
      } catch (e: RecoverException) {
        var userInfo = Arguments.createMap()
        e.guessesRemaining?.let {
          userInfo.putInt("guessesRemaining", it.toInt())
        }
        promise.reject(e.error.toString(), e, userInfo)
      } catch (e: Throwable) {
        promise.reject(e)
      }
    }
  }

  @ReactMethod
  fun delete(
    configuration: String,
    authentication: ReadableMap,
    promise: Promise
  ) {
    val authentication = authentication
      .toHashMap()
      .mapKeys {RealmId(string = it.key) }
      .mapValues { AuthToken(it.value.toString()) }

    val client = Client(configuration = Configuration(json = configuration), authTokens = authentication)
    runBlocking {
      try {
        client.delete()
        promise.resolve(null)
      } catch (e: DeleteException) {
        promise.reject(e.error.toString(), e)
      } catch (e: Throwable) {
        promise.reject(e)
      }
    }
  }

  @ReactMethod
  fun createAuthentication(
    realmIds: ReadableArray,
    signingParameters: String,
    secretId: String,
    promise: Promise
  ) {
    val realmIds = realmIds.toArrayList().map { RealmId(it.toString()) }

    val generator = AuthTokenGenerator(signingParameters)
    val secretId = SecretId(secretId)

    var authentication = Arguments.createMap()
    for (realmId in realmIds) {
      authentication.putString(realmId.toString(), generator.vend(realmId, secretId).toString())
    }
    promise.resolve(authentication)
  }

  @ReactMethod
  fun randomSecretId(promise: Promise) {
    promise.resolve(SecretId.random().toString())
  }

  companion object {
    const val NAME = "RNJuiceboxSdk"
  }
}

fun ReadableArray.toByteArray(): ByteArray {
  return toArrayList().map { (it as Double).toInt().toByte() }.toByteArray()
}
