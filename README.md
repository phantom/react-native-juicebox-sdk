# react-native-juicebox-sdk
Fork off of package
React native SDK for Juicebox

## Installation

```sh
# using npm
npm install react-native-juicebox-sdk

# OR using Yarn
yarn add react-native-juicebox-sdk
```

# Demo

Two [demo](demo) implementations are available.

# E-mail

The [email](demo/email) demo requires the user to authenticate with their email with a backend server. That server then generates tokens to authenticate with the Juicebox server.

You can run it with:
```bash
# using npm
npm demo-email start

# OR using Yarn
yarn demo-email start
```

# Serverless

The [serverless](demo/serverless) demo generates tokens to authenticate with the Juicebox server locally on the device and relies on CloudKit records or Google's BlockStore to persist a user identifier.

You can run it with:
```bash
# using npm
npm demo-serverless start

# OR using Yarn
yarn demo-serverless start
```

## Usage

```js
import JuiceboxSdk, {
  type Configuration,
  type AuthenticationSigningParameters,
  PinHashingMode,
  RecoverError,
  RecoverErrorReason,
} from 'react-native-juicebox-sdk';

const configuration = {
    realms: [
        {
            'address': 'https://juicebox.hsm.realm.address',
            'id': '0102030405060708090a0b0c0d0e0f10',
            'public_key': '0102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f20'
        },
        {
            'address': 'https://your.software.realm.address',
            'id': '2102030405060708090a0b0c0d0e0f10'
        },
        {
            'address': 'https://juicebox.software.realm.address',
            'id': '3102030405060708090a0b0c0d0e0f10'
        }
    ],
    register_threshold: 3,
    recover_threshold: 3,
    pin_hashing_mode: PinHashingMode.Standard2019
} as Configuration;

const signingParameters = {
    key: 'your-signing-private-key',
    tenant: 'acme',
    version: 1,
} as AuthenticationSigningParameters;

// ...

const authentication = await JuiceboxSdk.createAuthentication(
    configuration,
    signingParameters,
    '10000000000000000000000000000000'
);

await JuiceboxSdk.register(
    configuration,
    authentication,
    encoder.encode('1234'),
    encoder.encode('artemis'),
    encoder.encode('info'),
    5,
);

let secret = decoder.decode(await JuiceboxSdk.recover(
    configuration,
    authentication,
    encoder.encode('1234'),
    encoder.encode('info')
));

await JuiceboxSdk.delete(configuration, authentication);
```
