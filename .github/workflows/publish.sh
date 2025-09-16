#!/bin/bash
set -e

# Run the build
yarn build

# Publish using changeset directly
npx changeset publish
