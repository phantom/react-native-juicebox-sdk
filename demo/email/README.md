This is a demo of the React Native Juicebox SDK.

# About the demo

The e-mail demo intends to demonstrate a Juicebox onboarding flow that:
1. Generates Juicebox authentication tokens on a server external to the application
2. Authenticates with that server through a "magic" link sent to the user's email

The example server can be found in the [server](server) directory.

To perform authentication and achieve these goals, onboarding typically looks something like:
1. Request the user's e-mail
2. Send the user's e-mail to the server (`POST /email-token`) to send a confirmation e-mail
3. Receive a single-use token from the user's e-mail
4. Use the single-use token to authenticate with the server (`GET /auth-token`) to validate the user's e-mail and receive a server token
5. Request the user's PIN
6. Use the server token to request Juicebox tokens (`POST /juicebox-token`) for the configured realms
7. Perform the appropriate Juicebox operation using the SDK (register or recover)

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

# Server

For your convenience, this demo is configured to use an instance of the [server](server) that is hosted on Juicebox's servers. The go source code for the backend server is available in this repository.
