cmake_minimum_required(VERSION 3.4.1)
project(MyRustLib)

set (CMAKE_VERBOSE_MAKEFILE ON)
set (CMAKE_CXX_STANDARD 14)

add_library(react-native-my-rust-lib            SHARED
            ../cpp/react-native-my-rust-lib.cpp
            cpp-adapter.cpp
)

# Specifies a path to native header files.
include_directories(
            ../cpp
)
