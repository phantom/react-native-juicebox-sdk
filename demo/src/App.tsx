import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import Toast, { ErrorToast } from 'react-native-toast-message';

import AsyncStorage from '@react-native-async-storage/async-storage';

import Start from './Screens/Start';
import Setup from './Screens/Setup';
import Secret from './Screens/Secret';

const Stack = createStackNavigator();

const toastConfig = {
  error: (props: Object) => (
    <ErrorToast
      {...props}
      text1Style={styles.text1Style}
      text2Style={styles.text2Style}
    />
  ),
};

const App = () => {
  const [isSetupComplete, setIsSetupComplete] = useState<boolean | null>(null);

  useEffect(() => {
    // Check if we have a secret on device in AsyncStorage when the app starts
    const checkSetupState = async () => {
      setIsSetupComplete((await AsyncStorage.getItem('secret')) !== null);
    };
    checkSetupState();
  }, []);

  return isSetupComplete == null ? (
    <View style={styles.container}>
      <ActivityIndicator color={'#ffffff'} size={'large'} />
    </View>
  ) : (
    <>
      <NavigationContainer>
        <Stack.Navigator
          initialRouteName={isSetupComplete ? 'Secret' : 'Start'}
        >
          <Stack.Screen
            name="Start"
            component={Start}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="Setup"
            component={Setup}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="Secret"
            component={Secret}
            options={{ headerShown: false }}
          />
        </Stack.Navigator>
      </NavigationContainer>
      <Toast config={toastConfig} />
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#531ac8',
  },
  text1Style: {
    fontSize: 18,
  },
  text2Style: {
    fontSize: 16,
  },
});

export default App;
