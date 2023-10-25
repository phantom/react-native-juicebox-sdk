if (typeof Buffer === 'undefined') {
  global.Buffer = require('buffer').Buffer;
}
import React, { useState, useEffect } from 'react';
import {
  ActivityIndicator,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  NativeModules,
  Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ActionSheet from 'react-native-action-sheet';
import JuiceboxSdk, {
  type Configuration,
  type AuthenticationSigningParameters,
  PinHashingMode,
  RecoverError,
  RecoverErrorReason,
} from 'react-native-juicebox-sdk';
// @ts-ignore
import { randomBytes } from 'react-native-randombytes';
import Toast from 'react-native-toast-message';
import { CommonActions } from '@react-navigation/native';

const { SecretIdStorage } = NativeModules;

enum Mode {
  Create = 'Create',
  Confirm = 'Confirm',
  Recover = 'Recover',
}

const modeTitleMapping = {
  [Mode.Create]: 'Create your PIN',
  [Mode.Confirm]: 'Confirm your PIN',
  [Mode.Recover]: 'Enter your PIN',
};

// @ts-ignore
const Setup = ({ navigation, route }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [secret, setSecret] = useState<Uint8Array | null>(null);
  const [mode, setMode] = useState<Mode>(route.params.mode);
  const [secretId, setSecretId] = useState<string | null>(null);
  const [createPin, setCreatePin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [recoverPin, setRecoverPin] = useState('');
  const PIN_LENGTH = 6;

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
    key: '5077a1fd9dfbd60ed0c765ca114f67508e65a1850d3900199efc8a5f3de62c15',
    tenant: 'juiceboxdemo',
    version: 1,
  } as AuthenticationSigningParameters;

  const encoder = new TextEncoder();

  useEffect(() => {
    const createSecret = async () => {
      randomBytes(64, (_: any, random: Buffer) => {
        setSecret(Uint8Array.from(random));
      });
    };
    if (mode === Mode.Create) createSecret();

    if (secretId != null) return;

    const isNotSignedInError = ({
      message,
      code,
      domain,
    }: {
      message: string;
      code: string;
      domain: string | undefined;
    }) => {
      if (message === 'google drive unavailable') return true;
      if (code === '0' && domain === 'Juicebox.SecretIdStorage.AccountError')
        return true;
      return false;
    };

    const createSecretId = async () => {
      try {
        setSecretId(await SecretIdStorage.recover());
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

    switch (mode) {
      case Mode.Create:
      case Mode.Confirm:
        createSecretId();
        break;
      case Mode.Recover:
        restoreSecretId();
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
        // Display an action sheet when PINs don't match
        showErrorSheet('Incorrect PIN');
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

  const storeSecretIdAndSecretAndProceed = async () => {
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
        10
      );
    } catch (e) {
      showErrorSheet('Failed to Register (' + e + ')');
      setIsLoading(false);
      return;
    }

    try {
      await SecretIdStorage.register(secretId);
    } catch (error) {
      showNotSignedInError();
      setIsLoading(false);
      return;
    }

    setIsLoading(false);
    await navigateToSecret(secret!);
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
      navigateToSecret(recoveredSecret);
    } catch (e) {
      if (e instanceof RecoverError) {
        switch (e.reason) {
          case RecoverErrorReason.InvalidPin:
            switch (e.guessesRemaining) {
              case 1:
                setRecoverPin('');
                Toast.show({
                  type: 'error',
                  position: 'bottom',
                  text1: 'Invalid PIN',
                  text2: '1 guess remaining.',
                });
                break;
              case 0:
                showErrorSheet(
                  'Invalid PIN, no guesses remaining. Your secret has been destroyed.',
                  true
                );
                break;
              default:
                setRecoverPin('');
                Toast.show({
                  type: 'error',
                  position: 'bottom',
                  text1: 'Invalid PIN',
                  text2: e.guessesRemaining + ' guesses remaining.',
                });
                break;
            }

            break;
          case RecoverErrorReason.NotRegistered:
            showErrorSheet('Secret not registered.', true);
            break;
          default:
            showErrorSheet(
              'Failed to Recover (' + RecoverErrorReason[e.reason] + ')',
              true
            );
        }
      } else {
        showErrorSheet('Failed to Recover (' + JSON.stringify(e) + ')', true);
      }
    }
    setIsLoading(false);
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
    Toast.hide();
    switch (mode) {
      case Mode.Create:
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

  const showErrorSheet = (error: string, noRetry: boolean = false) => {
    const newPinLabel = 'Create New PIN';
    const options = noRetry ? [newPinLabel] : ['Retry', newPinLabel];
    ActionSheet.showActionSheetWithOptions(
      {
        title: error,
        options: options,
        destructiveButtonIndex: options.indexOf(newPinLabel),
      },
      (buttonIndex) => {
        if (buttonIndex === options.indexOf(newPinLabel)) {
          // Create a new PIN and start from step 1
          setConfirmPin('');
          setCreatePin('');
          setRecoverPin('');
          setMode(Mode.Create);
        } else {
          // Retry the confirmation step
          setConfirmPin('');
          setRecoverPin('');
        }
      }
    );
  };

  const showNotSignedInError = (message: string | null = null) => {
    var message = message;
    if (message == null) {
      switch (Platform.OS) {
        case 'ios':
          message = 'Sign in with iCloud to continue.';
          break;
        case 'android':
          message = 'Sign in with Google to continue.';
          break;
      }
    }

    Toast.show({
      type: 'error',
      position: 'bottom',
      text1: 'Storage Access Failed',
      text2: message!,
    });
    navigation.goBack();
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
      <Text style={styles.stepText}>{modeTitleMapping[mode]}</Text>
      <View style={styles.pinContainer}>
        {Array(PIN_LENGTH)
          .fill(0)
          .map((_, index) => (
            <View key={index} style={styles.pinCircle}>
              {index < currentPinLength() ? (
                <View style={styles.pinFilled} />
              ) : null}
            </View>
          ))}
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
            <Text style={styles.backspaceText}>←</Text>
          </TouchableOpacity>
        </View>
      </View>
      {isLoading && (
        <View style={styles.activityIndicator}>
          <ActivityIndicator color={'#531ac8'} size={'large'} />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
  },
  stepText: {
    fontSize: 18,
    marginBottom: 18,
    color: '#6a737d',
    fontWeight: 'bold',
  },
  pinContainer: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  pinCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#6a737d',
    marginRight: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pinFilled: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#000000',
  },
  numberPad: {
    flexDirection: 'column',
    alignItems: 'center',
  },
  numberRow: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  numberButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 1,
    borderColor: '#000000',
    margin: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyButton: {
    width: 80,
    height: 80,
    margin: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  numberText: {
    fontSize: 24,
    color: '#000000',
  },
  backspaceText: {
    fontSize: 24,
    color: '#000000',
    marginTop: Platform.OS === 'android' ? -12 : 0,
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
