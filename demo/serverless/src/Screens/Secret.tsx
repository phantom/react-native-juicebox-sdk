import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  AppState,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CommonActions } from '@react-navigation/native';
import EncryptedStorage from 'react-native-encrypted-storage';
import * as PeriodicReminders from '../PeriodicReminders';

// @ts-ignore
const Secret = ({ navigation, route }) => {
  const [secret, setSecret] = useState('');
  const [appState, setAppState] = useState(AppState.currentState);

  useEffect(() => {
    const appStateSubscription = AppState.addEventListener(
      'change',
      setAppState
    );
    return () => {
      appStateSubscription.remove();
    };
  }, [appState]);

  const handleSignOut = async () => {
    await PeriodicReminders.reset();
    await EncryptedStorage.removeItem('secret');
    await EncryptedStorage.removeItem('pin');
    navigation.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [{ name: 'Start' }],
      })
    );
  };

  useEffect(() => {
    if (appState !== 'active') return;

    const checkIsDueForReminder = async () => {
      if (await PeriodicReminders.isDueForReminder()) {
        navigation.dispatch(
          CommonActions.reset({
            index: 0,
            routes: [{ name: 'Setup', params: { mode: 'Verify' } }],
          })
        );
      }
    };

    checkIsDueForReminder();
  }, [appState, navigation]);

  useEffect(() => {
    const getSecret = async () => {
      const storedSecret = await EncryptedStorage.getItem('secret');
      setSecret(storedSecret!.match(/.{1,8}/g)!.join(' '));
    };
    getSecret();
  }, [route]);

  return (
    <SafeAreaView style={styles.container}>
      <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
        <Text style={styles.signOutButtonText}>Sign Out</Text>
      </TouchableOpacity>
      <View style={styles.roundRectContainer}>
        <View style={styles.roundRect}>
          <Text style={styles.secretLabel}>Secret Key</Text>
          <Text style={styles.secretText}>{secret}</Text>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'flex-end',
    justifyContent: 'flex-start',
    backgroundColor: '#1c1c1c',
  },
  checkmarkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 15,
  },
  checkmark: {
    width: 15,
    height: 15,
  },
  backedUpText: {
    color: '#006400',
    marginLeft: 8,
    fontSize: 14,
    fontWeight: 'bold',
  },
  roundRectContainer: {
    width: '100%',
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  roundRect: {
    backgroundColor: '#181818',
    borderColor: '#474747',
    borderWidth: 1,
    borderRadius: 18,
    alignItems: 'flex-start',
    minWidth: 360,
    paddingHorizontal: 20,
  },
  secretText: {
    fontSize: 15,
    fontWeight: '300',
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
    color: '#ABABAB',
    paddingVertical: 10,
    marginBottom: 8,
  },
  secretLabel: {
    fontWeight: 'bold',
    fontSize: 14,
    color: '#ffffff',
    marginTop: 15,
  },
  signOutButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  signOutButtonText: {
    color: '#fffdf8',
    fontSize: 14,
    fontWeight: 'bold',
  },
});

export default Secret;
