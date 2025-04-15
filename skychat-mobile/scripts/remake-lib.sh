#!/bin/bash

# exit on error
set -e

# start in the /mobile directory:

cd ../skychat-lib
pnpm ubrn:ios
cd ./rust_modules/uniffi-starter/rust/
./build-ios.sh
cd ../../../
pnpm prepare
cd ../


cd ./skychat-mobile
pnpm install
pnpm expo prebuild