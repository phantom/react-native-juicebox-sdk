#!/bin/bash

# Script to build Juicebox SDK AAR from the git submodule

set -e

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$SCRIPT_DIR/.."

echo "Building Juicebox SDK AAR..."

# Navigate to the Juicebox SDK Android directory
cd "$PROJECT_ROOT/external/juicebox-sdk/android"

# Build the AAR
./gradlew assembleRelease

# Create libs directory if it doesn't exist
mkdir -p "$PROJECT_ROOT/android/libs"

# Copy the AAR to the libs directory
cp build/outputs/aar/android-release.aar "$PROJECT_ROOT/android/libs/juicebox-sdk.aar"

echo "✅ Juicebox SDK AAR built and copied to android/libs/juicebox-sdk.aar"
