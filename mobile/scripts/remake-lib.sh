#!/bin/bash

cd ../skychat-lib
npm pack

cd ../skychat-mobile
rm -rf ./node_modules/skychat-lib
pnpm i
pnpm expo prebuild