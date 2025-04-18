#!/bin/bash

# exit on error
set -e

# start in the root directory:

# cd ./lib
# pnpm ubrn:ios
# cd ./rust_modules/uniffi-starter/rust/
# ./build-ios.sh
# cd ../../../
# pnpm prepare
# cd ../


# cd ./mobile
# pnpm install
# pnpm expo prebuild

pnpm lib ubrn:ios
pnpm i
cd ./mobile
pnpm expo prebuild
cd ios
pod install
cd ../../