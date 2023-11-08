This is a demo of the React Native Juicebox SDK.

# Running the Demo

>**Note**: Make sure you have completed the [React Native - Environment Setup](https://reactnative.dev/docs/environment-setup) instructions till "Creating a new application" step, before proceeding.

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

Yu can also run it directly from within Android Studio and Xcode respectively by opening the respective projects.

# Server

For your convenience, this demo is configured to use an instance of the [server](server) that is hosted on Juicebox's servers. The go source code for the backend server is available in this repository.
