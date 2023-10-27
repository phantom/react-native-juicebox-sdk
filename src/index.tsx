import { NativeModules, Platform } from 'react-native';
import type { Int32 } from 'react-native/Libraries/Types/CodegenTypes';

const LINKING_ERROR =
  `The package 'react-native-juicebox-sdk' doesn't seem to be linked. Make sure: \n\n` +
  Platform.select({ ios: "- You have run 'pod install'\n", default: '' }) +
  '- You rebuilt the app after installing the package\n' +
  '- You are not using Expo Go\n';

const RNJuiceboxSdk = NativeModules.RNJuiceboxSdk
  ? NativeModules.RNJuiceboxSdk
  : new Proxy(
      {},
      {
        get() {
          throw new Error(LINKING_ERROR);
        },
      }
    );

/**
 * Error returned during `Client.register`
 */
export enum RegisterError {
  /**
   * A realm rejected the `Client`'s auth token.
   */
  InvalidAuth = 0,
  /**
   * The SDK software is too old to communicate with this realm
   * and must be upgraded.
   */
  UpgradeRequired = 1,
  /**
   * A software error has occurred. This request should not be retried
   * with the same parameters. Verify your inputs, check for software
   * updates and try again.
   */
  Assertion = 2,
  /**
   * A transient error in sending or receiving requests to a realm.
   * This request may succeed by trying again with the same parameters.
   */
  Transient = 3,
}

/**
 * Error returned during `Client.recover`
 */
export class RecoverError {
  /**
   * Guesses remaining is only valid if `reason` is `InvalidPin`
   */
  guessesRemaining?: number;
  /**
   * The reason recovery failed.
   */
  reason: number;

  constructor(reason: number, guessesRemaining: number | undefined) {
    this.reason = reason;
    this.guessesRemaining = guessesRemaining;
  }
}

/**
 * The reason recovery failed.
 */
export enum RecoverErrorReason {
  /**
   * The secret could not be unlocked, but you can try again
   * with a different PIN if you have guesses remaining. If no
   * guesses remain, this secret is locked and inaccessible.
   */
  InvalidPin = 0,
  /**
   * The secret was not registered or not fully registered with the
   * provided realms.
   */
  NotRegistered = 1,
  /**
   * A realm rejected the `Client`'s auth token.
   */
  InvalidAuth = 2,
  /**
   * The SDK software is too old to communicate with this realm
   * and must be upgraded.
   */
  UpgradeRequired = 3,
  /**
   * A software error has occurred. This request should not be retried
   * with the same parameters. Verify your inputs, check for software
   * updates and try again.
   */
  Assertion = 4,
  /**
   * A transient error in sending or receiving requests to a realm.
   * This request may succeed by trying again with the same parameters.
   */
  Transient = 5,
}

/**
 * Error returned during `Client.delete`
 */
export enum DeleteError {
  /**
   * A realm rejected the `Client`'s auth token.
   */
  InvalidAuth = 0,
  /**
   * The SDK software is too old to communicate with this realm
   * and must be upgraded.
   */
  UpgradeRequired = 1,
  /**
   * A software error has occurred. This request should not be retried
   * with the same parameters. Verify your inputs, check for software
   * updates and try again.
   */
  Assertion = 2,
  /**
   * A transient error in sending or receiving requests to a realm.
   * This request may succeed by trying again with the same parameters.
   */
  Transient = 3,
}

/**
 * A 16-byte hexadecimal identifier for a realm.
 */
export type RealmId = string;

/**
 * A 16-byte hexadecimal identifier for a secret.
 */
export type SecretId = string;

/**
 * A JWT token used for authentication with a `Realm`.
 */
export type AuthenticationToken = string;

/**
 * A record of authentication token for a given `Realm`.
 */
export type Authentication = Record<RealmId, AuthenticationToken>;

/**
 * The parameters used to configure a `Realm`.
 */
export interface Realm {
  /**
   * A 16-byte hexadecimal identifier for a realm.
   */
  id: RealmId;
  /**
   * The URL at which to access the realm API.
   */
  address: string;
  /**
   * An optional hexadecimal public key for the realm.
   */
  public_key?: string;
}

/**
 * Defines how the provided PIN will be hashed before register and
 * recover operations.
 */
export enum PinHashingMode {
  /**
   * A tuned hash, secure for use on modern devices as of 2019 with low-entropy PINs.
   */
  Standard2019 = 'Standard2019',
  /**
   * A fast hash used for testing. Do not use in production.
   */
  FastInsecure = 'FastInsecure',
}

/**
 * The parameters used to configure a `Client`.
 */
export interface Configuration {
  /**
   * There must be between `registerThreshold` and 255 realms, inclusive.
   */
  realms: Realm[];
  /**
   * A registration will be considered successful if it's successful
   * on at least this many realms.
   *
   * Must be between `recoverThreshold` and `realms.count`, inclusive.
   */
  register_threshold: Int32;
  /**
   * A recovery (or an adversary) will need the cooperation of this
   * many realms to retrieve the secret.
   *
   * Must be between `ceil(realms.count / 2)` and `realms.count`, inclusive.
   */
  recover_threshold: Int32;
  /**
   * Defines how the provided PIN will be hashed before register and
   * recover operations. Changing modes will make previous secrets stored
   * on the realms inaccessible with the same PIN and should not be done
   * without re-registering secrets.
   */
  pin_hashing_mode: PinHashingMode;
}

/**
 * Configuration for on device authentication.
 */
export interface AuthenticationSigningParameters {
  /**
   * A hex string representing the private signing key.
   */
  key: string;
  /**
   * The name of the tenant the key belongs to.
   */
  tenant: string;
  /**
   * The integer version of the signing key.
   */
  version: Int32;
}

export type Uint8 = number;

export interface JuiceboxSdk {
  /**
   * Stores a new PIN-protected secret on the configured realms.
   *
   * @param {Configuration} configuration - The configuration to store
   * the secret on.
   * @param {Authentication} authentication - The authentication details
   * for the provided configuration.
   * @param {Uint8Array} pin - A user provided PIN. If using a strong
   * `PinHashingMode`, this can safely be a low-entropy value.
   * @param {Uint8Array} secret - A user provided secret with a maximum
   * length of 128-bytes.
   * @param {Uint8Array} info - Additional data added to the salt for the
   * configured `PinHashingMode`.
   * The chosen data must be consistent between registration and recovery or
   * recovery will fail. This data does not need to be a well-kept secret. A
   * user's ID is a reasonable choice, but even the name of the company or
   * service could be viable if nothing else is available.
   * @param {Int32} num_guesses - The number of guesses allowed before the
   * secret can no longer be accessed.
   *
   * @returns {Promise<void>} – If registration could not be completed successfully,
   * the promise will be rejected with a {@link RegisterError}.
   */
  register(
    configuration: Configuration,
    authentication: Authentication,
    pin: Uint8Array,
    secret: Uint8Array,
    info: Uint8Array,
    numGuesses: Int32
  ): Promise<void>;

  /**
   * Retrieves a PIN-protected secret from the configured realms, or falls back to the
   * previous realms if the current realms do not have any secret registered.
   *
   * @param {Configuration} configuration - The configuration to store
   * the secret on.
   * @param {Authentication} authentication - The authentication details
   * for the provided configuration.
   * @param {Uint8Array} pin - A user provided PIN. If using a strong `PinHashingMode`,
   * this can safely be a low-entropy value.
   * @param {Uint8Array} info - Additional data added to the salt for the configured
   * `PinHashingMode`.
   * The chosen data must be consistent between registration and recovery or recovery
   * will fail. This data does not need to be a well-kept secret. A user's ID is a reasonable
   * choice, but even the name of the company or service could be viable if nothing else
   * is available.
   *
   * @returns {Promise<Uint8Array>} - The recovered user provided secret. If recovery could not
   * be completed successfully, the promise will be rejected with a {@link RecoverError}.
   */
  recover(
    configuration: Configuration,
    authentication: Authentication,
    pin: Uint8Array,
    info: Uint8Array
  ): Promise<Uint8Array>;

  /**
   * Deletes the registered secret for this user, if any.
   *
   * @param {Configuration} configuration - The configuration to delete
   * the secret from.
   * @param {Authentication} authentication - The authentication details
   * for the provided configuration.
   *
   * @returns {Promise<void>} - If delete could not be completed successfully, the promise will
   * be rejected with a {@link DeleteError}.
   */
  delete(
    configuration: Configuration,
    authentication: Authentication
  ): Promise<void>;

  /**
   * Vends new authentication tokens for the given parameters.
   *
   * @param {Configuration} configuration – The configuration to
   * authenticate with.
   * @param {AuthenticationSigningParameters} signingParameters – The
   * parameters to use when signing the tokens.
   * @param {SecretId} secretId – The 16-byte hexadecimal secret identifier to
   * authorize the tokens for.
   *
   * @returns {AuthenticationToken} - An authentication token.
   */
  createAuthentication(
    configuration: Configuration,
    signingParameters: AuthenticationSigningParameters,
    secretId: SecretId
  ): Promise<Authentication>;

  /**
   * Generate a new random secret id.
   */
  randomSecretId(): Promise<SecretId>;
}

export default {
  register: async (c, a, p, s, i, g) => {
    try {
      await RNJuiceboxSdk.register(
        JSON.stringify(c),
        a,
        Array.from(p),
        Array.from(s),
        Array.from(i),
        g
      );
    } catch (e) {
      console.log(JSON.stringify(e));

      // @ts-ignore
      switch (e.code) {
        case 'invalidAuth':
        case 'INVALID_AUTH':
          throw RegisterError.InvalidAuth;
        case 'upgradeRequired':
        case 'UPGRADE_REQUIRED':
          throw RegisterError.UpgradeRequired;
        case 'assertion':
        case 'ASSERTION':
          throw RegisterError.Assertion;
        case 'transient':
        case 'TRANSIENT':
          throw RegisterError.Transient;
      }

      throw e;
    }
  },
  recover: async (c, a, p, i) => {
    try {
      const secret = await RNJuiceboxSdk.recover(
        JSON.stringify(c),
        a,
        Array.from(p),
        Array.from(i)
      );
      return Uint8Array.from(secret);
    } catch (e) {
      // @ts-ignore
      switch (e.code) {
        case 'invalidAuth':
        case 'INVALID_AUTH':
          throw new RecoverError(RecoverErrorReason.InvalidAuth, undefined);
        case 'upgradeRequired':
        case 'UPGRADE_REQUIRED':
          throw new RecoverError(RecoverErrorReason.UpgradeRequired, undefined);
        case 'notRegistered':
        case 'NOT_REGISTERED':
          throw new RecoverError(RecoverErrorReason.NotRegistered, undefined);
        case 'assertion':
        case 'ASERTION':
          throw new RecoverError(RecoverErrorReason.Assertion, undefined);
        case 'transient':
        case 'TRANSIENT':
          throw new RecoverError(RecoverErrorReason.Transient, undefined);
        case 'INVALID_PIN':
          // @ts-ignore
          throw new RecoverError(
            RecoverErrorReason.InvalidPin,
            // @ts-ignore
            e.userInfo.guessesRemaining
          );
      }

      const regex = /guessesRemaining:\s(\d+)/;
      // @ts-ignore
      const match = regex.exec(e.code);

      if (match) {
        throw new RecoverError(
          RecoverErrorReason.InvalidPin,
          // @ts-ignore
          parseInt(match[1], 10)
        );
      }

      throw e;
    }
  },
  delete: async (c, a) => {
    try {
      await RNJuiceboxSdk.delete(JSON.stringify(c), a);
    } catch (e) {
      // @ts-ignore
      switch (e.code) {
        case 'invalidAuth':
        case 'INVALID_AUTH':
          throw DeleteError.InvalidAuth;
        case 'upgradeRequired':
        case 'UPGRADE_REQUIRED':
          throw DeleteError.UpgradeRequired;
        case 'assertion':
        case 'ASSERTION':
          throw DeleteError.Assertion;
        case 'transient':
        case 'TRANSIENT':
          throw DeleteError.Transient;
      }

      throw e;
    }
  },
  createAuthentication: (c, s, u) =>
    RNJuiceboxSdk.createAuthentication(
      c.realms.map((realm) => realm.id),
      JSON.stringify(s),
      u
    ),
  randomSecretId: RNJuiceboxSdk.randomSecretId,
} as JuiceboxSdk;
