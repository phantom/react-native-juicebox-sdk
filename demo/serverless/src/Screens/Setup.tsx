if (typeof Buffer === 'undefined') {
  global.Buffer = require('buffer').Buffer;
}
import React, { useState, useEffect, useRef } from 'react';
import {
  Alert,
  ActivityIndicator,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  NativeModules,
  Platform,
  Image,
  Animated,
  Easing,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import JuiceboxSdk, {
  type Configuration,
  type AuthenticationSigningParameters,
  PinHashingMode,
  RecoverError,
  RecoverErrorReason,
} from 'react-native-juicebox-sdk';
// @ts-ignore
import { randomBytes } from 'react-native-randombytes';
import { CommonActions } from '@react-navigation/native';
import EncryptedStorage from 'react-native-encrypted-storage';
import * as PeriodicReminders from '../PeriodicReminders';

const { SecretIdStorage } = NativeModules;

enum Mode {
  Create = 'Create',
  Confirm = 'Confirm',
  Recover = 'Recover',
  Verify = 'Verify',
}

// @ts-ignore
const Setup = ({ navigation, route }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [secret, setSecret] = useState<Uint8Array | null>(null);
  const [mode, setMode] = useState<Mode>(route.params.mode);
  const [secretId, setSecretId] = useState<string | null>(null);
  const [createPin, setCreatePin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [recoverPin, setRecoverPin] = useState('');
  const [verifyPin, setVerifyPin] = useState('');
  const [incorrectVerifyAttempts, setIncorrectVerifyAttempts] = useState(false);
  const [message, setMessage] = useState('');

  const PIN_LENGTH = 6;
  const ALLOWED_GUESSES = 5;

  const titleForMode = (m: Mode) => {
    switch (m) {
      case Mode.Create:
      case Mode.Confirm:
        return 'Create passcode';
      case Mode.Recover:
        return 'Enter passcode';
      case Mode.Verify:
        return 'Verify passcode';
    }
  };

  const subtitleForMode = (m: Mode) => {
    switch (m) {
      case Mode.Create:
      case Mode.Confirm:
        return `Set a ${PIN_LENGTH}-digit passcode to recover and unlock your secret.`;
      case Mode.Recover:
        return `Use the ${PIN_LENGTH}-digit passcode you created when creating your secret.`;
      case Mode.Verify:
        return 'To help you memorize your passcode, we ask you to enter it periodically.';
    }
  };

  const shakeAnimation = useRef(new Animated.Value(0)).current;

  const playShakeAnimation = () =>
    Animated.sequence([
      Animated.timing(shakeAnimation, {
        toValue: 10,
        duration: 100,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnimation, {
        toValue: -10,
        duration: 100,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnimation, {
        toValue: 10,
        duration: 100,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnimation, {
        toValue: 0,
        duration: 100,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    ]).start();

  const configuration = {
    realms: [
      {
        address: 'https://gcp.realms.juicebox.xyz',
        id: '9f105f0bf34461034df2ba67b17e5f43',
      },
      {
        address: 'https://aws.realms.juicebox.xyz',
        id: '7546bca7074dd6af64a3c230f04ef803',
      },
      {
        id: '44e18495c18a3c459954d73d2689e839',
        public_key:
          'f6ce077e253010a45101f299a22748cb613a83bd69458e4c3fd36bffdc3c066a',
        address: 'https://lb.juicebox.xyz/',
      },
    ],
    register_threshold: 3,
    recover_threshold: 3,
    pin_hashing_mode: PinHashingMode.Standard2019,
  } as Configuration;

  const signingParameters = {
    key: '302e020100300506032b65700422042070f4086a565233bd57bb577ddf7966d9d506e98e459eba6b4c521f04dd0f9d9c',
    tenant: 'juiceboxdemo',
    version: 2,
  } as AuthenticationSigningParameters;

  const encoder = new TextEncoder();

  useEffect(() => {
    const createSecret = async () => {
      randomBytes(64, (_: any, random: Buffer) => {
        setSecret(Uint8Array.from(random));
      });
    };
    if (mode === Mode.Create && secret === null) createSecret();

    if (secretId != null) return;

    const isNotSignedInError = ({
      message: m,
      code,
      domain,
    }: {
      message: string;
      code: string;
      domain: string | undefined;
    }) => {
      if (m === 'google drive unavailable') return true;
      if (code === '0' && domain === 'Juicebox.SecretIdStorage.AccountError')
        return true;
      return false;
    };

    const createSecretId = async () => {
      try {
        setSecretId(await SecretIdStorage.recover());
        showDoYouWantToRestore();
      } catch (e) {
        // @ts-ignore
        if (isNotSignedInError(e)) {
          showNotSignedInError();
        } else {
          setSecretId(await JuiceboxSdk.randomSecretId());
        }
      }
    };

    const restoreSecretId = async () => {
      try {
        setSecretId(await SecretIdStorage.recover());
      } catch (e) {
        showNotSignedInError(
          // @ts-ignore
          !isNotSignedInError(e) ? 'An existing account was not found.' : null
        );
      }
    };

    const restoreSecret = async () => {
      const storedSecret = await EncryptedStorage.getItem('secret');
      setSecret(
        new Uint8Array(
          storedSecret!.match(/.{1,2}/g)!.map((byte) => parseInt(byte, 16))
        )
      );
    };

    switch (mode) {
      case Mode.Create:
      case Mode.Confirm:
        createSecretId();
        break;
      case Mode.Recover:
        restoreSecretId();
        break;
      case Mode.Verify:
        restoreSecretId();
        restoreSecret();
        break;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  useEffect(() => {
    if (mode !== Mode.Create) {
      return;
    }
    if (createPin.length === PIN_LENGTH) {
      // Automatically move to the confirmation step when PIN_LENGTH digits are entered
      setMode(Mode.Confirm);
      setMessage('Re-type your passcode');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [createPin]);

  useEffect(() => {
    if (mode !== Mode.Confirm) {
      return;
    }
    if (confirmPin.length === PIN_LENGTH) {
      if (createPin === confirmPin) {
        // Store the PIN and navigate to the next screen
        storeSecretIdAndSecretAndProceed();
      } else {
        playShakeAnimation();
        setMessage('Passcodes do not match. Try again');
        setConfirmPin('');
        setCreatePin('');
        setMode(Mode.Create);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [confirmPin]);

  useEffect(() => {
    if (mode !== Mode.Recover) {
      return;
    }
    if (recoverPin.length === PIN_LENGTH) {
      recoverSecretAndProceed();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recoverPin]);

  useEffect(() => {
    if (mode !== Mode.Verify) {
      return;
    }
    if (verifyPin.length === PIN_LENGTH) {
      confirmVerificationAndProceed();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [verifyPin]);

  const confirmVerificationAndProceed = async () => {
    const storedPin = await EncryptedStorage.getItem('pin');
    if (verifyPin === storedPin) {
      PeriodicReminders.completedReminder(incorrectVerifyAttempts);
      navigation.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [{ name: 'Secret' }],
        })
      );
    } else {
      playShakeAnimation();
      setIncorrectVerifyAttempts(true);
      Alert.alert(
        'Forgot passcode?',
        'The incorrect passcode was entered.',
        [
          {
            text: 'Try Again',
            isPreferred: true,
            onPress: () => setVerifyPin(''),
          },
          {
            text: 'Change Passcode',
            style: 'destructive',
            onPress: () => setMode(Mode.Create),
          },
        ],
        { cancelable: false }
      );
    }
  };

  const storeSecretIdAndSecretAndProceed = async () => {
    setMessage('');
    setIsLoading(true);

    const authentication = await JuiceboxSdk.createAuthentication(
      configuration,
      signingParameters,
      secretId!
    );

    try {
      await JuiceboxSdk.register(
        configuration,
        authentication,
        encoder.encode(createPin),
        secret!,
        encoder.encode(secretId!),
        ALLOWED_GUESSES
      );
    } catch (e) {
      showErrorAlert('Failed to Register (' + e + ')');
      setIsLoading(false);
      return;
    }

    try {
      await SecretIdStorage.register(secretId);
    } catch (error) {
      setIsLoading(false);

      // @ts-ignore
      if (error.domain === 'CKErrorDomain') {
        // @ts-ignore
        if (error.code === '25') {
          Alert.alert(
            'iCloud Storage Full',
            'Launch Settings, tap "iCloud", and free space before trying again.',
            [
              {
                text: 'OK',
                style: 'cancel',
                onPress: () => navigation.goBack(),
              },
            ],
            { cancelable: false }
          );
        } else {
          Alert.alert(
            'CloudKit Write Failure',
            // @ts-ignore
            error.message,
            [
              {
                text: 'OK',
                style: 'cancel',
                onPress: () => navigation.goBack(),
              },
            ],
            { cancelable: false }
          );
        }
      } else {
        showNotSignedInError();
      }

      return;
    }

    await navigateToSecret(secret!, createPin);
  };

  const showDoYouWantToRestore = () => {
    Alert.alert(
      'Recover existing secret?',
      'An existing secret was detected. If you create a new secret, your existing secret will be permanently unrecoverable.',
      [
        {
          text: 'Recover Existing Secret',
          isPreferred: true,
          onPress: () => {
            setMode(Mode.Recover);
          },
        },
        {
          text: 'Create New Secret',
          style: 'destructive',
          onPress: () => {},
        },
      ],
      { cancelable: false }
    );
  };

  const recoverSecretAndProceed = async () => {
    setIsLoading(true);

    const authentication = await JuiceboxSdk.createAuthentication(
      configuration,
      signingParameters,
      secretId!
    );

    try {
      const recoveredSecret = await JuiceboxSdk.recover(
        configuration,
        authentication,
        encoder.encode(recoverPin),
        encoder.encode(secretId!)
      );
      setSecret(recoveredSecret);
      navigateToSecret(recoveredSecret, recoverPin);
    } catch (e) {
      if (e instanceof RecoverError) {
        switch (e.reason) {
          case RecoverErrorReason.InvalidPin:
            setRecoverPin('');
            if (e.guessesRemaining! > 0) {
              playShakeAnimation();
              setMessage(
                'Incorrect passcode, try again\n\n' +
                  e.guessesRemaining +
                  ' / ' +
                  ALLOWED_GUESSES +
                  ' attempts remaining'
              );
            } else {
              await SecretIdStorage.delete();
              setMode(Mode.Create);
              setMessage('Unrecoverable, create a new secret');
            }
            break;
          case RecoverErrorReason.NotRegistered:
            await SecretIdStorage.delete();
            setMode(Mode.Create);
            setMessage('No existing secret, create a new secret');
            break;
          default:
            showErrorAlert(
              'Failed to Recover (' + RecoverErrorReason[e.reason] + ')'
            );
        }
      } else {
        showErrorAlert('Failed to Recover (' + JSON.stringify(e) + ')');
      }
    }
    setIsLoading(false);
  };

  const navigateToSecret = async (s: Uint8Array, pin: string) => {
    const hex = Buffer.from(s).toString('hex');
    await PeriodicReminders.updateLastReminderTime();
    await EncryptedStorage.setItem('secret', hex);
    await EncryptedStorage.setItem('pin', pin);
    navigation.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [{ name: 'Secret' }],
      })
    );
  };

  const handleNumPress = (number: string) => {
    switch (mode) {
      case Mode.Create:
        setMessage('');
        if (createPin.length < PIN_LENGTH) {
          setCreatePin(createPin + number);
        }
        break;
      case Mode.Confirm:
        if (confirmPin.length < PIN_LENGTH) {
          setConfirmPin(confirmPin + number);
        }
        break;
      case Mode.Recover:
        setMessage('');
        if (recoverPin.length < PIN_LENGTH) {
          setRecoverPin(recoverPin + number);
        }
        break;
      case Mode.Verify:
        setMessage('');
        if (verifyPin.length < PIN_LENGTH) {
          setVerifyPin(verifyPin + number);
        }
        break;
    }
  };

  const handleBackspace = () => {
    switch (mode) {
      case Mode.Create:
        setCreatePin(createPin.slice(0, -1));
        break;
      case Mode.Confirm:
        setConfirmPin(confirmPin.slice(0, -1));
        break;
      case Mode.Recover:
        setRecoverPin(recoverPin.slice(0, -1));
        break;
      case Mode.Verify:
        setVerifyPin(verifyPin.slice(0, -1));
        break;
    }
  };

  const showErrorAlert = (error: string) => {
    Alert.alert(
      error,
      undefined,
      [
        {
          text: 'Create New PIN',
          style: 'destructive',
          onPress: () => {
            // Create a new PIN and start from step 1
            setConfirmPin('');
            setCreatePin('');
            setRecoverPin('');
            setMessage('');
            setMode(Mode.Create);
          },
        },
        {
          text: 'Retry',
          onPress: () => {
            // Retry the confirmation step
            setConfirmPin('');
            setRecoverPin('');
          },
        },
      ],
      { cancelable: false }
    );
  };

  const showNotSignedInError = (m: string | null = null) => {
    var m = m;
    if (m == null) {
      switch (Platform.OS) {
        case 'ios':
          m = 'Sign in with iCloud to continue.';
          break;
        case 'android':
          m = 'Sign in with Google to continue.';
          break;
      }
    }

    Alert.alert(
      'Storage Access Failed',
      m!,
      [
        {
          text: 'Cancel',
          style: 'cancel',
          onPress: () => navigation.goBack(),
        },
      ],
      { cancelable: false }
    );
  };

  const currentPinLength = () => {
    switch (mode) {
      case Mode.Create:
        return createPin.length;
      case Mode.Confirm:
        return confirmPin.length;
      case Mode.Recover:
        return recoverPin.length;
      case Mode.Verify:
        return verifyPin.length;
    }
  };

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        {navigation.canGoBack() && (
          <View style={styles.backButtonContainer}>
            <TouchableOpacity onPress={() => navigation.goBack()}>
              <Image
                source={require('../../assets/back.png')}
                style={styles.backButton}
              />
            </TouchableOpacity>
          </View>
        )}
        <View style={styles.header}>
          <Text style={styles.title}>{titleForMode(mode)}</Text>
          <Text style={styles.subtitle}>{subtitleForMode(mode)}</Text>
          <Animated.View
            style={[
              styles.pinContainer,
              { transform: [{ translateX: shakeAnimation }] },
            ]}
          >
            {Array(PIN_LENGTH)
              .fill(0)
              .map((_, index) => (
                <View key={index} style={styles.pinCircle}>
                  {index < currentPinLength() ? (
                    <View style={styles.pinFilled} />
                  ) : null}
                </View>
              ))}
          </Animated.View>
          <View style={styles.messageContainer}>
            <Text style={styles.message}>{message}</Text>
          </View>
        </View>
        <View style={styles.numberPad}>
          {Array(3)
            .fill(0)
            .map((_row, rowIndex) => (
              <View key={rowIndex} style={styles.numberRow}>
                {Array(3)
                  .fill(0)
                  .map((_column, colIndex) => {
                    const number = rowIndex * 3 + colIndex + 1;
                    return (
                      <TouchableOpacity
                        key={colIndex}
                        style={styles.numberButton}
                        onPress={() => handleNumPress(number.toString())}
                      >
                        <Text style={styles.numberText}>{number}</Text>
                      </TouchableOpacity>
                    );
                  })}
              </View>
            ))}
          <View style={styles.numberRow}>
            <TouchableOpacity style={styles.emptyButton} disabled>
              <Text style={styles.numberText}>&nbsp;</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.numberButton}
              onPress={() => handleNumPress('0')}
            >
              <Text style={styles.numberText}>0</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.numberButton}
              onPress={handleBackspace}
            >
              <Image
                source={require('../../assets/back.png')}
                style={styles.backButton}
              />
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
      {isLoading && (
        <View style={styles.activityIndicator}>
          <ActivityIndicator color={'#8c5eea'} size={'large'} />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: '#1c1c1c',
  },
  safeArea: {
    flex: 1,
    width: '100%',
  },
  backButtonContainer: {
    padding: 20,
  },
  backButton: {
    width: 25,
    height: 25,
  },
  header: {
    flex: 1,
    justifyContent: 'center',
    height: '100%',
    width: '100%',
    paddingVertical: 30,
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 24,
    marginBottom: 18,
    color: '#fffdf8',
    fontWeight: 'bold',
  },
  subtitle: {
    fontSize: 18,
    marginBottom: 18,
    color: '#999999',
    fontWeight: '500',
  },
  messageContainer: {
    marginTop: 16,
    paddingHorizontal: 20,
    minHeight: 100,
  },
  message: {
    fontSize: 18,
    color: '#fffdf8',
    fontWeight: 'bold',
    textAlign: 'center',
  },
  pinContainer: {
    justifyContent: 'center',
    flexDirection: 'row',
    marginVertical: 20,
    height: 25,
  },
  pinCircle: {
    width: 25,
    height: 25,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#fffdf8',
    marginRight: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pinFilled: {
    width: 25,
    height: 25,
    borderRadius: 20,
    backgroundColor: '#fffdf8',
  },
  numberPad: {
    flex: 1,
    justifyContent: 'flex-end',
    flexDirection: 'column',
    alignItems: 'center',
  },
  numberRow: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  numberButton: {
    width: 90,
    height: 60,
    margin: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyButton: {
    width: 90,
    height: 60,
    margin: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  numberText: {
    fontSize: 32,
    color: '#fffdf8',
  },
  activityIndicator: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#00000050',
    position: 'absolute',
    x: 0,
    y: 0,
    width: '100%',
    height: '100%',
  },
});

export default Setup;
