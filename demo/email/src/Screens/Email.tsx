if (typeof Buffer === 'undefined') {
  global.Buffer = require('buffer').Buffer;
}
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  TextInput,
  Linking,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

enum Mode {
  Create = 'Create',
  Recover = 'Recover',
}

// @ts-ignore
const Email = ({ navigation, route }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [hasShownErrors, setHasShownErrors] = useState(false);
  const [isErrorMessage, setIsErrorMessage] = useState(false);
  const [mode] = useState<Mode>(route.params.mode);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const handleURL = async (url: string) => {
      const u = new URL(url);
      if (
        u.hostname === 'demo-backend.juicebox.xyz' &&
        u.pathname === '/app/confirm'
      ) {
        const emailToken = u.searchParams.get('token')!;
        setIsLoading(true);
        try {
          const response = await fetch(
            'https://demo-backend.juicebox.xyz/auth-token',
            {
              method: 'GET',
              headers: { Authorization: 'Bearer ' + emailToken },
            }
          );
          setIsLoading(false);
          if (response.status === 200) {
            setMessage('');
            setEmail('');
            navigation.navigate('Setup', {
              mode,
              token: await response.text(),
            });
          } else {
            setIsErrorMessage(true);
            setMessage('Failed to confirm e-mail');
          }
        } catch {
          setIsLoading(false);
          setIsErrorMessage(true);
          setMessage('Failed to confirm e-mail');
        }
      }
    };

    const subscription = Linking.addEventListener('url', ({ url }) =>
      handleURL(url)
    );
    return () => subscription.remove();
  }, [navigation, mode]);

  const titleForMode = (_m: Mode) => {
    return 'Sign in to Juicebox';
  };

  const subtitleForMode = (m: Mode) => {
    switch (m) {
      case Mode.Create:
        return 'Enter your e-mail address and we’ll send you a link to get started.';
      case Mode.Recover:
        return 'Enter the e-mail address you used during registration and we’ll send you a link to begin recovery.';
    }
  };

  const handleEmailChange = (text: string) => {
    setEmail(text);

    if (isValidEmail(text)) {
      setIsErrorMessage(false);
      setMessage('');
    } else if (hasShownErrors) {
      showEmailErrors(text);
    }
  };

  const isValidEmail = (e: string) => {
    // Regular expression for basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(e);
  };

  const showEmailErrors = (e: string) => {
    setHasShownErrors(true);
    setIsErrorMessage(true);
    if (e === '') {
      setMessage('Please fill in your e-mail');
    } else {
      setMessage('That e-mail is invalid');
    }
  };

  const handleEmailDone = async () => {
    if (isValidEmail(email)) {
      setIsLoading(true);

      try {
        const response = await fetch(
          'https://demo-backend.juicebox.xyz/email-token',
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email,
              appName: 'Juicebox',
              logoPath:
                'https://assets-global.website-files.com/64650413ab0c96a6b686cac9/6467eec48e8cabed89c29dc4_juicebox-logo-purple.png',
            }),
          }
        );
        setIsLoading(false);

        if (response.status === 200) {
          setIsErrorMessage(false);
          setMessage('Check your e-mail to continue');
        } else {
          setIsErrorMessage(true);
          setMessage('Failed to send e-mail');
        }
      } catch {
        setIsLoading(false);
        setIsErrorMessage(true);
        setMessage('Failed to send e-mail');
      }
    } else {
      showEmailErrors(email);
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
          <View style={styles.emailInputContainer}>
            <TextInput
              autoFocus={true}
              style={styles.emailInput}
              placeholder="name@domain.com"
              placeholderTextColor={'#555555'}
              onChangeText={handleEmailChange}
              value={email}
              keyboardType="email-address"
              keyboardAppearance="dark"
              returnKeyType="done"
              autoCapitalize="none"
              autoComplete="email"
              onSubmitEditing={handleEmailDone}
            />
          </View>
          <View style={styles.messageContainer}>
            <Text
              style={[
                styles.message,
                isErrorMessage ? styles.errorMessage : styles.message,
              ]}
            >
              {message}
            </Text>
          </View>
        </View>
        <View style={styles.bottomSpacer} />
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
  errorMessage: {
    color: '#8b0000',
  },
  emailInputContainer: {
    marginVertical: 20,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#fffdf8',
  },
  emailInput: {
    justifyContent: 'center',
    flexDirection: 'row',
    color: '#fffdf8',
    fontSize: 18,
    textAlign: 'center',
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
  bottomSpacer: {
    flex: 1,
  },
});

export default Email;
