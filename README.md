# SkyChat

A secure chat application built with OpenMLS (Messaging Layer Security) providing end-to-end encryption.

## Overview

SkyChat is a cross-platform chat application that uses the OpenMLS protocol to provide secure, end-to-end encrypted group messaging. It's built with:

- Rust core for cryptography and security
- React Native for mobile clients
- UniFFI for native bindings
- OpenMLS for the messaging security protocol

## Features

- End-to-end encrypted group messaging
- Cross-platform support (iOS & Android)
- Secure key storage and management
- Modern cryptographic primitives via RustCrypto

## Project Structure

```
skychat/
├── core/               # Rust core library
│   ├── core/         # Core library / shared
│   ├── client/         # Client implementation
│   ├── server/         # Server implementation
│   └── examples/       # Examples
├── mobile/             # React Native mobile app
└── lib/                # React Native native module
```

## development / building jank:

to get this building you need to run the following from a clean clone of the repo:

```
cd lib && yarn install
cd mobile && yarn install


cd lib && yarn bob build
# you must then edit the source to ignore the ArrayBufferLike type errors! (and run bob build again)

cd mobile
./scripts/remake-lib.sh
cd ios && pod install
yarn expo
```
