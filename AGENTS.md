# Repository instructions

## Purpose
This repository contains Phantom's React Native SDK for Juicebox. The package bridges JavaScript and TypeScript APIs to native iOS and Android implementations; Android uses a locally built AAR from the `external/juicebox-sdk` submodule.

## Layout
- `src/`: React Native package source.
- `ios/`, `android/`, and `cpp/`: native bridge implementations.
- `external/juicebox-sdk/`: Phantom Juicebox SDK git submodule.
- `scripts/build-juicebox-aar.sh`: builds the Android AAR from the submodule.
- `demo/email/` and `demo/serverless/`: example applications.

## Development and validation
Use Node.js 24 and the repository-pinned Yarn 3.6.1 release.

- Initialize the SDK submodule: `git submodule update --init --recursive`
- Install dependencies: `yarn install --immutable`
- Lint: `yarn lint`
- Type-check: `yarn typecheck`
- Run unit tests with CI settings: `yarn test --maxWorkers=2 --coverage`
- Build package outputs: `yarn prepare`
- Rebuild the Android AAR after changing or updating the submodule: `./scripts/build-juicebox-aar.sh`

Keep `yarn.lock` immutable in CI. After advancing `external/juicebox-sdk`, rebuild and commit the corresponding `android/libs/juicebox-sdk.aar`.
