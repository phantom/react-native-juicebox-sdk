import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CommonActions } from '@react-navigation/native';

// @ts-ignore
const Secret = ({ navigation, route }) => {
  const [secret, setSecret] = useState('');

  const handleSignOut = async () => {
    await AsyncStorage.removeItem('secret');
    navigation.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [{ name: 'Start' }],
      })
    );
  };

  useEffect(() => {
    const getSecret = async () => {
      const storedSecret = await AsyncStorage.getItem('secret');
      setSecret(storedSecret!.match(/.{1,8}/g)!.join(' '));
    };
    getSecret();
  }, [route]);

  return (
    <View style={styles.container}>
      <View style={styles.roundRect}>
        <Text style={styles.secretLabel}>Your Secret</Text>
        <Text style={styles.secretText}>{secret}</Text>
        <View style={styles.checkmarkRow}>
          <Image
            source={require('../../assets/checkmark.png')}
            style={styles.checkmark}
          />
          <Text style={styles.backedUpText}>Registered with Juicebox</Text>
        </View>
      </View>
      <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
        <Text style={styles.signOutButtonText}>Sign Out</Text>
      </TouchableOpacity>
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
    color: '#43A047',
    marginLeft: 8,
    fontSize: 14,
    fontWeight: 'bold',
  },
  roundRect: {
    backgroundColor: '#f7f7f7',
    borderRadius: 20,
    alignItems: 'center',
    maxWidth: 360,
  },
  secretText: {
    fontSize: 15,
    fontWeight: '300',
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
    color: '#032f62',
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  secretLabel: {
    fontWeight: 'bold',
    fontSize: 14,
    color: '#6a737d',
    marginTop: 15,
  },
  signOutButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  signOutButtonText: {
    color: '#531ac8',
    fontSize: 14,
    fontWeight: 'bold',
  },
});

export default Secret;
