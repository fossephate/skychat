#include <jni.h>
#include "react-native-my-rust-lib2.h"

extern "C"
JNIEXPORT jdouble JNICALL
Java_com_myrustlib2_MyRustLib2Module_nativeMultiply(JNIEnv *env, jclass type, jdouble a, jdouble b) {
    return myrustlib2::multiply(a, b);
}
