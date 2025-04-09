#!/bin/bash

# exit on error
set -e

# start in the /mobile directory:

cd ../lib
# yarn ubrn:ios
cd ./rust_modules/uniffi-starter/rust/
# ./build-ios.sh
cd ../../../
yarn prepare
cd ../


cd ./mobile
yarn install
# yarn expo prebuild