cmake_minimum_required(VERSION 3.4.1)
project(MyRustLib2)

set (CMAKE_VERBOSE_MAKEFILE ON)
set (CMAKE_CXX_STANDARD 14)

add_library(react-native-my-rust-lib2            SHARED
            ../cpp/react-native-my-rust-lib2.cpp
            cpp-adapter.cpp
)

# Specifies a path to native header files.
include_directories(
            ../cpp
)
