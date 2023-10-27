import React from 'react';
import {
  Platform,
  Alert,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  NativeModules,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const { SecretIdStorage } = NativeModules;

// @ts-ignore
const Start = ({ navigation }) => {
  const showSignInRequiredError = () => {
    Alert.alert(
      'Sign in to iCloud',
      `Juicebox requires iCloud drive. Sign in to your iCloud account to continue.

      On the Home screen, launch Settings, tap "iCloud", and enter your Apple ID. Turn iCloud Drive on.

      If you don't have an iCloud account, tap "Create a new Apple ID".`,
      [
        {
          text: 'OK',
          isPreferred: true,
          onPress: () => {},
        },
      ],
      { cancelable: false }
    );
  };

  const handleGetStarted = () => {
    const checkSignedInAndGo = async () => {
      try {
        await SecretIdStorage.isAvailable();
        navigation.navigate('Setup', { mode: 'Create' });
      } catch {
        showSignInRequiredError();
      }
    };
    checkSignedInAndGo();
  };

  const handleRecover = () => {
    const checkRecoverAndGo = async () => {
      try {
        await SecretIdStorage.recover();
        navigation.navigate('Setup', { mode: 'Recover' });
      } catch (e) {
        if (
          // @ts-ignore
          e.code === '0' &&
          // @ts-ignore
          e.domain === 'Juicebox.SecretIdStorage.AccountError'
        ) {
          showSignInRequiredError();
        } else {
          Alert.alert(
            'No Secret Found',
            'No record of an existing secret was found. Create a new secret, or verify your device is logged into the appropriate ' +
              (Platform.OS === 'ios' ? 'iCloud' : 'Google') +
              ' account.',
            [
              {
                text: 'OK',
                isPreferred: true,
                onPress: () => {},
              },
            ],
            { cancelable: false }
          );
        }
      }
    };
    checkRecoverAndGo();
  };

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.logoContainer}>
          <Image
            source={require('../../assets/splash.png')}
            style={styles.logo}
            resizeMode="contain"
          />
        </View>
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={handleGetStarted}
          >
            <Text style={styles.buttonText}>Create a new secret</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={handleRecover}
          >
            <Text style={styles.secondaryButtonText}>
              I already have a secret
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1c1c1c',
  },
  safeArea: {
    flex: 1,
  },
  textContainer: {
    flex: 1,
    paddingHorizontal: 24,
    marginTop: 16,
  },
  title: {
    color: '#fffdf8',
    fontWeight: 'bold',
    fontSize: 32,
    textAlign: 'center',
    marginBottom: 16,
  },
  body: {
    color: '#fffdf8',
    fontSize: 20,
    textAlign: 'center',
    fontWeight: '400',
  },
  logoContainer: {
    flex: 5,
  },
  logo: {
    width: '100%',
    height: '100%',
  },
  buttonContainer: {
    flex: 1,
    alignItems: 'center',
    marginVertical: 60,
    width: '100%',
  },
  primaryButton: {
    backgroundColor: '#8c5eea',
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 30,
    marginBottom: 10,
    width: '90%',
  },
  buttonText: {
    color: '#1c1c1c',
    fontWeight: '500',
    fontSize: 18,
    textAlign: 'center',
  },
  secondaryButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  secondaryButtonText: {
    color: '#fffdf8',
    fontSize: 18,
    fontWeight: '600',
  },
});

export default Start;
