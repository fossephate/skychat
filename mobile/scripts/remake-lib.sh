#!/bin/bash

# start in the /mobile directory:

cd ../lib
yarn ubrn:ios
cd ./rust_modules/uniffi-starter/rust/
./build-ios.sh
cd ../../../../


cd ./mobile
yarn install
yarn expo prebuild