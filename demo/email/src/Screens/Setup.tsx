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
  Image,
  Animated,
  Easing,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import JuiceboxSdk, {
  type Configuration,
  PinHashingMode,
  RecoverError,
  RecoverErrorReason,
  type Authentication,
} from 'react-native-juicebox-sdk';
// @ts-ignore
import { randomBytes } from 'react-native-randombytes';
import { CommonActions } from '@react-navigation/native';

enum Mode {
  Create = 'Create',
  Confirm = 'Confirm',
  Recover = 'Recover',
}

// @ts-ignore
const Setup = ({ navigation, route }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [secret, setSecret] = useState<Uint8Array | null>(null);
  const [mode, setMode] = useState<Mode>(route.params.mode);
  const [token] = useState<string>(route.params.token);
  const [createPin, setCreatePin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [recoverPin, setRecoverPin] = useState('');
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
    }
  };

  const subtitleForMode = (m: Mode) => {
    switch (m) {
      case Mode.Create:
      case Mode.Confirm:
        return `Set a ${PIN_LENGTH}-digit passcode to recover and unlock your secret.`;
      case Mode.Recover:
        return `Use the ${PIN_LENGTH}-digit passcode you created when creating your secret.`;
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

  const encoder = new TextEncoder();

  useEffect(() => {
    const createSecret = async () => {
      randomBytes(64, (_: any, random: Buffer) => {
        setSecret(Uint8Array.from(random));
      });
    };
    if (mode === Mode.Create) createSecret();
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
        registerAndProceed();
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

  const registerAndProceed = async () => {
    setMessage('');
    setIsLoading(true);

    var authentication: Authentication;
    try {
      authentication = await fetchAuthentication();
    } catch (e) {
      showErrorAlert('Failed to Authenticate (' + e + ')');
      setIsLoading(false);
      return;
    }

    try {
      await JuiceboxSdk.register(
        configuration,
        authentication,
        encoder.encode(createPin),
        secret!,
        encoder.encode('juicebox'),
        ALLOWED_GUESSES
      );
    } catch (e) {
      showErrorAlert('Failed to Register (' + e + ')');
      setIsLoading(false);
      return;
    }

    setIsLoading(false);
    await navigateToSecret(secret!);
  };

  const recoverSecretAndProceed = async () => {
    setIsLoading(true);

    var authentication: Authentication;
    try {
      authentication = await fetchAuthentication();
    } catch (e) {
      showErrorAlert('Failed to Authenticate (' + e + ')');
      setIsLoading(false);
      return;
    }

    try {
      const recoveredSecret = await JuiceboxSdk.recover(
        configuration,
        authentication,
        encoder.encode(recoverPin),
        encoder.encode('juicebox')
      );
      setSecret(recoveredSecret);
      navigateToSecret(recoveredSecret);
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
              setMode(Mode.Create);
              setMessage('Unrecoverable, create a new secret');
            }
            break;
          case RecoverErrorReason.NotRegistered:
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

  const fetchAuthentication = async () => {
    var authentication: Authentication = {};
    for (const realm of configuration.realms) {
      const response = await fetch(
        'https://demo-backend.juicebox.xyz/juicebox-token',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + token,
          },
          body: JSON.stringify({ realmID: realm.id }),
        }
      );
      if (response.status === 200) {
        authentication[realm.id] = await response.text();
      } else {
        throw 'Unexpected response status';
      }
    }
    return authentication;
  };

  const navigateToSecret = async (s: Uint8Array) => {
    const hex = Buffer.from(s).toString('hex');
    await AsyncStorage.setItem('secret', hex);
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

  const currentPinLength = () => {
    switch (mode) {
      case Mode.Create:
        return createPin.length;
      case Mode.Confirm:
        return confirmPin.length;
      case Mode.Recover:
        return recoverPin.length;
    }
  };

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.backButtonContainer}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Image
              source={require('../../assets/back.png')}
              style={styles.backButton}
            />
          </TouchableOpacity>
        </View>
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
