#include <jni.h>
#include "react-native-my-rust-lib.h"

extern "C"
JNIEXPORT jdouble JNICALL
Java_com_myrustlib_MyRustLibModule_nativeMultiply(JNIEnv *env, jclass type, jdouble a, jdouble b) {
    return myrustlib::multiply(a, b);
}
