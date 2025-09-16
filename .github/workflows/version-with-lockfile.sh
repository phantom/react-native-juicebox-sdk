#!/bin/bash
set -e

# Run the changeset version command
yarn changeset version

# Update the lockfile to match the new versions
yarn install --mode update-lockfile
