import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';

// @ts-ignore
const Start = ({ navigation }) => {
  const handleGetStarted = () => {
    navigation.navigate('Setup', { mode: 'Create' });
  };

  const handleRecover = () => {
    navigation.navigate('Setup', { mode: 'Recover' });
  };

  return (
    <View style={styles.container}>
      <Image source={require('../../assets/splash.png')} style={styles.logo} />
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={handleGetStarted}
        >
          <Text style={styles.buttonText}>Get Started</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={handleRecover}
        >
          <Text style={styles.secondaryButtonText}>
            I already have an account
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#531ac8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: 300,
    height: 300,
  },
  buttonContainer: {
    alignItems: 'center',
    marginTop: 20,
  },
  primaryButton: {
    backgroundColor: '#ffffff',
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 30,
    marginBottom: 10,
  },
  buttonText: {
    color: '#1E3B70',
    fontWeight: 'bold',
    fontSize: 18,
    textAlign: 'center',
  },
  secondaryButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  secondaryButtonText: {
    color: '#ffffff',
    fontSize: 16,
  },
});

export default Start;
