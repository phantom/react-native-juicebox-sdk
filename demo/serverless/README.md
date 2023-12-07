This is a demo of the React Native Juicebox SDK.

# About the demo

The serverless demo intends to demonstrate a Juicebox onboarding flow that generates Juicebox authentication tokens within the application, without requiring a backend server.

To perform authentication and achieve these goals, registering typically looks something like:
1. Generate a random Secret ID with the SDK
2. Request the user's PIN
3. Use the Secret ID along with your signing key to request Juicebox tokens for the configured realms from the SDK
4. Perform the appropriate Juicebox operation using the SDK (register or recover)
5. Store the Secret ID so it can be available during recovery across installs and devices. This demo utilizes CloudKit records on iOS and BlockStore on Android for this purpose

# Running the Demo

## Step 1: Start the Metro Server

First, you will need to start **Metro**, the JavaScript _bundler_ that ships _with_ React Native.

To start Metro, run the following command from this folder:

```bash
# using npm
npm start

# OR using Yarn
yarn start
```

## Step 2: Start your Application

Let Metro Bundler run in its _own_ terminal. Open a _new_ terminal from this folder.

Run the following command to start the _Android_ or _iOS_ demo:

### For Android

```bash
# using npm
npm run android

# OR using Yarn
yarn android
```

### For iOS

```bash
# using npm
npm run ios

# OR using Yarn
yarn ios
```

If everything is set up _correctly_, you should see the demo running in your _Android Emulator_ or _iOS Simulator_ shortly provided you have set up your emulator/simulator correctly.

You can also run it directly from within Android Studio and Xcode respectively by opening the respective projects.
