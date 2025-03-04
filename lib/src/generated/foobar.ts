// This file was autogenerated by some hot garbage in the `uniffi-bindgen-react-native` crate.
// Trust me, you don't want to mess with it!
import nativeModule, {
  type UniffiRustFutureContinuationCallback,
  type UniffiForeignFuture,
  type UniffiForeignFutureStructU8,
  type UniffiForeignFutureCompleteU8,
  type UniffiForeignFutureStructI8,
  type UniffiForeignFutureCompleteI8,
  type UniffiForeignFutureStructU16,
  type UniffiForeignFutureCompleteU16,
  type UniffiForeignFutureStructI16,
  type UniffiForeignFutureCompleteI16,
  type UniffiForeignFutureStructU32,
  type UniffiForeignFutureCompleteU32,
  type UniffiForeignFutureStructI32,
  type UniffiForeignFutureCompleteI32,
  type UniffiForeignFutureStructU64,
  type UniffiForeignFutureCompleteU64,
  type UniffiForeignFutureStructI64,
  type UniffiForeignFutureCompleteI64,
  type UniffiForeignFutureStructF32,
  type UniffiForeignFutureCompleteF32,
  type UniffiForeignFutureStructF64,
  type UniffiForeignFutureCompleteF64,
  type UniffiForeignFutureStructPointer,
  type UniffiForeignFutureCompletePointer,
  type UniffiForeignFutureStructRustBuffer,
  type UniffiForeignFutureCompleteRustBuffer,
  type UniffiForeignFutureStructVoid,
  type UniffiForeignFutureCompleteVoid,
} from './foobar-ffi';
import {
  type FfiConverter,
  type UniffiByteArray,
  type UniffiObjectFactory,
  type UniffiRustArcPtr,
  type UnsafeMutableRawPointer,
  AbstractFfiConverterByteArray,
  FfiConverterArray,
  FfiConverterArrayBuffer,
  FfiConverterBool,
  FfiConverterInt32,
  FfiConverterMap,
  FfiConverterObject,
  FfiConverterOptional,
  FfiConverterUInt64,
  RustBuffer,
  UniffiAbstractObject,
  UniffiInternalError,
  UniffiRustCaller,
  destructorGuardSymbol,
  pointerLiteralSymbol,
  uniffiCreateFfiConverterString,
  uniffiCreateRecord,
  uniffiTypeNameSymbol,
} from 'uniffi-bindgen-react-native';

// Get converters from the other files, if any.
const uniffiCaller = new UniffiRustCaller();

const uniffiIsDebug =
  // @ts-ignore -- The process global might not be defined
  typeof process !== 'object' ||
  // @ts-ignore -- The process global might not be defined
  process?.env?.NODE_ENV !== 'production' ||
  false;
// Public interface members begin here.

export type ConvoInviteWrapper = {
  senderId: string;
  groupName: string;
  welcomeMessage: ArrayBuffer;
  ratchetTree: ArrayBuffer | undefined;
  globalIndex: /*u64*/ bigint;
  fanned: ArrayBuffer | undefined;
};

/**
 * Generated factory for {@link ConvoInviteWrapper} record objects.
 */
export const ConvoInviteWrapper = (() => {
  const defaults = () => ({});
  const create = (() => {
    return uniffiCreateRecord<ConvoInviteWrapper, ReturnType<typeof defaults>>(
      defaults
    );
  })();
  return Object.freeze({
    /**
     * Create a frozen instance of {@link ConvoInviteWrapper}, with defaults specified
     * in Rust, in the {@link foobar} crate.
     */
    create,

    /**
     * Create a frozen instance of {@link ConvoInviteWrapper}, with defaults specified
     * in Rust, in the {@link foobar} crate.
     */
    new: create,

    /**
     * Defaults specified in the {@link foobar} crate.
     */
    defaults: () => Object.freeze(defaults()) as Partial<ConvoInviteWrapper>,
  });
})();

const FfiConverterTypeConvoInviteWrapper = (() => {
  type TypeName = ConvoInviteWrapper;
  class FFIConverter extends AbstractFfiConverterByteArray<TypeName> {
    read(from: RustBuffer): TypeName {
      return {
        senderId: FfiConverterString.read(from),
        groupName: FfiConverterString.read(from),
        welcomeMessage: FfiConverterArrayBuffer.read(from),
        ratchetTree: FfiConverterOptionalArrayBuffer.read(from),
        globalIndex: FfiConverterUInt64.read(from),
        fanned: FfiConverterOptionalArrayBuffer.read(from),
      };
    }
    write(value: TypeName, into: RustBuffer): void {
      FfiConverterString.write(value.senderId, into);
      FfiConverterString.write(value.groupName, into);
      FfiConverterArrayBuffer.write(value.welcomeMessage, into);
      FfiConverterOptionalArrayBuffer.write(value.ratchetTree, into);
      FfiConverterUInt64.write(value.globalIndex, into);
      FfiConverterOptionalArrayBuffer.write(value.fanned, into);
    }
    allocationSize(value: TypeName): number {
      return (
        FfiConverterString.allocationSize(value.senderId) +
        FfiConverterString.allocationSize(value.groupName) +
        FfiConverterArrayBuffer.allocationSize(value.welcomeMessage) +
        FfiConverterOptionalArrayBuffer.allocationSize(value.ratchetTree) +
        FfiConverterUInt64.allocationSize(value.globalIndex) +
        FfiConverterOptionalArrayBuffer.allocationSize(value.fanned)
      );
    }
  }
  return new FFIConverter();
})();

export type ConvoMessageWrapper = {
  globalIndex: /*u64*/ bigint;
  senderId: string;
  unixTimestamp: /*u64*/ bigint;
  message: ArrayBuffer | undefined;
  invite: ConvoInviteWrapper | undefined;
};

/**
 * Generated factory for {@link ConvoMessageWrapper} record objects.
 */
export const ConvoMessageWrapper = (() => {
  const defaults = () => ({});
  const create = (() => {
    return uniffiCreateRecord<ConvoMessageWrapper, ReturnType<typeof defaults>>(
      defaults
    );
  })();
  return Object.freeze({
    /**
     * Create a frozen instance of {@link ConvoMessageWrapper}, with defaults specified
     * in Rust, in the {@link foobar} crate.
     */
    create,

    /**
     * Create a frozen instance of {@link ConvoMessageWrapper}, with defaults specified
     * in Rust, in the {@link foobar} crate.
     */
    new: create,

    /**
     * Defaults specified in the {@link foobar} crate.
     */
    defaults: () => Object.freeze(defaults()) as Partial<ConvoMessageWrapper>,
  });
})();

const FfiConverterTypeConvoMessageWrapper = (() => {
  type TypeName = ConvoMessageWrapper;
  class FFIConverter extends AbstractFfiConverterByteArray<TypeName> {
    read(from: RustBuffer): TypeName {
      return {
        globalIndex: FfiConverterUInt64.read(from),
        senderId: FfiConverterString.read(from),
        unixTimestamp: FfiConverterUInt64.read(from),
        message: FfiConverterOptionalArrayBuffer.read(from),
        invite: FfiConverterOptionalTypeConvoInviteWrapper.read(from),
      };
    }
    write(value: TypeName, into: RustBuffer): void {
      FfiConverterUInt64.write(value.globalIndex, into);
      FfiConverterString.write(value.senderId, into);
      FfiConverterUInt64.write(value.unixTimestamp, into);
      FfiConverterOptionalArrayBuffer.write(value.message, into);
      FfiConverterOptionalTypeConvoInviteWrapper.write(value.invite, into);
    }
    allocationSize(value: TypeName): number {
      return (
        FfiConverterUInt64.allocationSize(value.globalIndex) +
        FfiConverterString.allocationSize(value.senderId) +
        FfiConverterUInt64.allocationSize(value.unixTimestamp) +
        FfiConverterOptionalArrayBuffer.allocationSize(value.message) +
        FfiConverterOptionalTypeConvoInviteWrapper.allocationSize(value.invite)
      );
    }
  }
  return new FFIConverter();
})();

export type LocalGroupWrapper = {
  name: string;
  globalIndex: /*u64*/ bigint;
  decrypted: Array<MessageItemWrapper>;
};

/**
 * Generated factory for {@link LocalGroupWrapper} record objects.
 */
export const LocalGroupWrapper = (() => {
  const defaults = () => ({});
  const create = (() => {
    return uniffiCreateRecord<LocalGroupWrapper, ReturnType<typeof defaults>>(
      defaults
    );
  })();
  return Object.freeze({
    /**
     * Create a frozen instance of {@link LocalGroupWrapper}, with defaults specified
     * in Rust, in the {@link foobar} crate.
     */
    create,

    /**
     * Create a frozen instance of {@link LocalGroupWrapper}, with defaults specified
     * in Rust, in the {@link foobar} crate.
     */
    new: create,

    /**
     * Defaults specified in the {@link foobar} crate.
     */
    defaults: () => Object.freeze(defaults()) as Partial<LocalGroupWrapper>,
  });
})();

const FfiConverterTypeLocalGroupWrapper = (() => {
  type TypeName = LocalGroupWrapper;
  class FFIConverter extends AbstractFfiConverterByteArray<TypeName> {
    read(from: RustBuffer): TypeName {
      return {
        name: FfiConverterString.read(from),
        globalIndex: FfiConverterUInt64.read(from),
        decrypted: FfiConverterArrayTypeMessageItemWrapper.read(from),
      };
    }
    write(value: TypeName, into: RustBuffer): void {
      FfiConverterString.write(value.name, into);
      FfiConverterUInt64.write(value.globalIndex, into);
      FfiConverterArrayTypeMessageItemWrapper.write(value.decrypted, into);
    }
    allocationSize(value: TypeName): number {
      return (
        FfiConverterString.allocationSize(value.name) +
        FfiConverterUInt64.allocationSize(value.globalIndex) +
        FfiConverterArrayTypeMessageItemWrapper.allocationSize(value.decrypted)
      );
    }
  }
  return new FFIConverter();
})();

export type MessageItemWrapper = {
  text: string;
  senderId: string;
  timestamp: /*u64*/ bigint;
};

/**
 * Generated factory for {@link MessageItemWrapper} record objects.
 */
export const MessageItemWrapper = (() => {
  const defaults = () => ({});
  const create = (() => {
    return uniffiCreateRecord<MessageItemWrapper, ReturnType<typeof defaults>>(
      defaults
    );
  })();
  return Object.freeze({
    /**
     * Create a frozen instance of {@link MessageItemWrapper}, with defaults specified
     * in Rust, in the {@link foobar} crate.
     */
    create,

    /**
     * Create a frozen instance of {@link MessageItemWrapper}, with defaults specified
     * in Rust, in the {@link foobar} crate.
     */
    new: create,

    /**
     * Defaults specified in the {@link foobar} crate.
     */
    defaults: () => Object.freeze(defaults()) as Partial<MessageItemWrapper>,
  });
})();

const FfiConverterTypeMessageItemWrapper = (() => {
  type TypeName = MessageItemWrapper;
  class FFIConverter extends AbstractFfiConverterByteArray<TypeName> {
    read(from: RustBuffer): TypeName {
      return {
        text: FfiConverterString.read(from),
        senderId: FfiConverterString.read(from),
        timestamp: FfiConverterUInt64.read(from),
      };
    }
    write(value: TypeName, into: RustBuffer): void {
      FfiConverterString.write(value.text, into);
      FfiConverterString.write(value.senderId, into);
      FfiConverterUInt64.write(value.timestamp, into);
    }
    allocationSize(value: TypeName): number {
      return (
        FfiConverterString.allocationSize(value.text) +
        FfiConverterString.allocationSize(value.senderId) +
        FfiConverterUInt64.allocationSize(value.timestamp)
      );
    }
  }
  return new FFIConverter();
})();

export type ProcessedResultsWrapper = {
  message: string | undefined;
  invite: ConvoInviteWrapper | undefined;
};

/**
 * Generated factory for {@link ProcessedResultsWrapper} record objects.
 */
export const ProcessedResultsWrapper = (() => {
  const defaults = () => ({});
  const create = (() => {
    return uniffiCreateRecord<
      ProcessedResultsWrapper,
      ReturnType<typeof defaults>
    >(defaults);
  })();
  return Object.freeze({
    /**
     * Create a frozen instance of {@link ProcessedResultsWrapper}, with defaults specified
     * in Rust, in the {@link foobar} crate.
     */
    create,

    /**
     * Create a frozen instance of {@link ProcessedResultsWrapper}, with defaults specified
     * in Rust, in the {@link foobar} crate.
     */
    new: create,

    /**
     * Defaults specified in the {@link foobar} crate.
     */
    defaults: () =>
      Object.freeze(defaults()) as Partial<ProcessedResultsWrapper>,
  });
})();

const FfiConverterTypeProcessedResultsWrapper = (() => {
  type TypeName = ProcessedResultsWrapper;
  class FFIConverter extends AbstractFfiConverterByteArray<TypeName> {
    read(from: RustBuffer): TypeName {
      return {
        message: FfiConverterOptionalString.read(from),
        invite: FfiConverterOptionalTypeConvoInviteWrapper.read(from),
      };
    }
    write(value: TypeName, into: RustBuffer): void {
      FfiConverterOptionalString.write(value.message, into);
      FfiConverterOptionalTypeConvoInviteWrapper.write(value.invite, into);
    }
    allocationSize(value: TypeName): number {
      return (
        FfiConverterOptionalString.allocationSize(value.message) +
        FfiConverterOptionalTypeConvoInviteWrapper.allocationSize(value.invite)
      );
    }
  }
  return new FFIConverter();
})();

export type SerializedCredentialsWrapper = {
  signer: ArrayBuffer;
  storage: Map<string, ArrayBuffer>;
  groupNames: Array<string>;
  groupNameToId: Map<string, ArrayBuffer>;
  serializedCredentialWithKey: ArrayBuffer;
};

/**
 * Generated factory for {@link SerializedCredentialsWrapper} record objects.
 */
export const SerializedCredentialsWrapper = (() => {
  const defaults = () => ({});
  const create = (() => {
    return uniffiCreateRecord<
      SerializedCredentialsWrapper,
      ReturnType<typeof defaults>
    >(defaults);
  })();
  return Object.freeze({
    /**
     * Create a frozen instance of {@link SerializedCredentialsWrapper}, with defaults specified
     * in Rust, in the {@link foobar} crate.
     */
    create,

    /**
     * Create a frozen instance of {@link SerializedCredentialsWrapper}, with defaults specified
     * in Rust, in the {@link foobar} crate.
     */
    new: create,

    /**
     * Defaults specified in the {@link foobar} crate.
     */
    defaults: () =>
      Object.freeze(defaults()) as Partial<SerializedCredentialsWrapper>,
  });
})();

const FfiConverterTypeSerializedCredentialsWrapper = (() => {
  type TypeName = SerializedCredentialsWrapper;
  class FFIConverter extends AbstractFfiConverterByteArray<TypeName> {
    read(from: RustBuffer): TypeName {
      return {
        signer: FfiConverterArrayBuffer.read(from),
        storage: FfiConverterMapStringArrayBuffer.read(from),
        groupNames: FfiConverterArrayString.read(from),
        groupNameToId: FfiConverterMapStringArrayBuffer.read(from),
        serializedCredentialWithKey: FfiConverterArrayBuffer.read(from),
      };
    }
    write(value: TypeName, into: RustBuffer): void {
      FfiConverterArrayBuffer.write(value.signer, into);
      FfiConverterMapStringArrayBuffer.write(value.storage, into);
      FfiConverterArrayString.write(value.groupNames, into);
      FfiConverterMapStringArrayBuffer.write(value.groupNameToId, into);
      FfiConverterArrayBuffer.write(value.serializedCredentialWithKey, into);
    }
    allocationSize(value: TypeName): number {
      return (
        FfiConverterArrayBuffer.allocationSize(value.signer) +
        FfiConverterMapStringArrayBuffer.allocationSize(value.storage) +
        FfiConverterArrayString.allocationSize(value.groupNames) +
        FfiConverterMapStringArrayBuffer.allocationSize(value.groupNameToId) +
        FfiConverterArrayBuffer.allocationSize(
          value.serializedCredentialWithKey
        )
      );
    }
  }
  return new FFIConverter();
})();

const stringConverter = {
  stringToBytes: (s: string) =>
    uniffiCaller.rustCall((status) =>
      nativeModule().ubrn_uniffi_internal_fn_func_ffi__string_to_arraybuffer(
        s,
        status
      )
    ),
  bytesToString: (ab: UniffiByteArray) =>
    uniffiCaller.rustCall((status) =>
      nativeModule().ubrn_uniffi_internal_fn_func_ffi__arraybuffer_to_string(
        ab,
        status
      )
    ),
  stringByteLength: (s: string) =>
    uniffiCaller.rustCall((status) =>
      nativeModule().ubrn_uniffi_internal_fn_func_ffi__string_to_byte_length(
        s,
        status
      )
    ),
};
const FfiConverterString = uniffiCreateFfiConverterString(stringConverter);

// FfiConverter for Map<string, ArrayBuffer>
const FfiConverterMapStringArrayBuffer = new FfiConverterMap(
  FfiConverterString,
  FfiConverterArrayBuffer
);

export interface ConvoManagerInterface {
  createInvite(
    groupId: ArrayBuffer,
    keyPackage: ArrayBuffer
  ): ConvoInviteWrapper;
  createMessage(groupId: ArrayBuffer, message: string): ArrayBuffer;
  createNewGroup(name: string): ArrayBuffer;
  getKeyPackage(): ArrayBuffer;
  getPartialGroup(groupId: ArrayBuffer): LocalGroupWrapper;
  getPendingInvites(): Array<ConvoInviteWrapper>;
  groupGetEpoch(groupId: ArrayBuffer): /*u64*/ bigint;
  groupGetIndex(groupId: ArrayBuffer): /*u64*/ bigint;
  groupPushMessage(
    groupId: ArrayBuffer,
    message: string,
    senderId: string
  ): void;
  groupSetIndex(groupId: ArrayBuffer, index: /*u64*/ bigint): void;
  loadState(state: SerializedCredentialsWrapper): void;
  processConvoMessages(
    messages: Array<ConvoMessageWrapper>,
    groupId: ArrayBuffer | undefined
  ): void;
  processMessage(
    message: ArrayBuffer,
    senderId: string | undefined
  ): ProcessedResultsWrapper;
  processRawInvite(
    senderId: string,
    groupName: string,
    welcomeMessage: ArrayBuffer,
    ratchetTree: ArrayBuffer | undefined,
    keyPackage: ArrayBuffer | undefined
  ): void;
  saveState(): SerializedCredentialsWrapper;
}

export class ConvoManager
  extends UniffiAbstractObject
  implements ConvoManagerInterface
{
  readonly [uniffiTypeNameSymbol] = 'ConvoManager';
  readonly [destructorGuardSymbol]: UniffiRustArcPtr;
  readonly [pointerLiteralSymbol]: UnsafeMutableRawPointer;
  constructor(name: string) {
    super();
    const pointer = uniffiCaller.rustCall(
      /*caller:*/ (callStatus) => {
        return nativeModule().ubrn_uniffi_foobar_fn_constructor_convomanager_new(
          FfiConverterString.lower(name),
          callStatus
        );
      },
      /*liftString:*/ FfiConverterString.lift
    );
    this[pointerLiteralSymbol] = pointer;
    this[destructorGuardSymbol] =
      uniffiTypeConvoManagerObjectFactory.bless(pointer);
  }

  public createInvite(
    groupId: ArrayBuffer,
    keyPackage: ArrayBuffer
  ): ConvoInviteWrapper {
    return FfiConverterTypeConvoInviteWrapper.lift(
      uniffiCaller.rustCall(
        /*caller:*/ (callStatus) => {
          return nativeModule().ubrn_uniffi_foobar_fn_method_convomanager_create_invite(
            uniffiTypeConvoManagerObjectFactory.clonePointer(this),
            FfiConverterArrayBuffer.lower(groupId),
            FfiConverterArrayBuffer.lower(keyPackage),
            callStatus
          );
        },
        /*liftString:*/ FfiConverterString.lift
      )
    );
  }

  public createMessage(groupId: ArrayBuffer, message: string): ArrayBuffer {
    return FfiConverterArrayBuffer.lift(
      uniffiCaller.rustCall(
        /*caller:*/ (callStatus) => {
          return nativeModule().ubrn_uniffi_foobar_fn_method_convomanager_create_message(
            uniffiTypeConvoManagerObjectFactory.clonePointer(this),
            FfiConverterArrayBuffer.lower(groupId),
            FfiConverterString.lower(message),
            callStatus
          );
        },
        /*liftString:*/ FfiConverterString.lift
      )
    );
  }

  public createNewGroup(name: string): ArrayBuffer {
    return FfiConverterArrayBuffer.lift(
      uniffiCaller.rustCall(
        /*caller:*/ (callStatus) => {
          return nativeModule().ubrn_uniffi_foobar_fn_method_convomanager_create_new_group(
            uniffiTypeConvoManagerObjectFactory.clonePointer(this),
            FfiConverterString.lower(name),
            callStatus
          );
        },
        /*liftString:*/ FfiConverterString.lift
      )
    );
  }

  public getKeyPackage(): ArrayBuffer {
    return FfiConverterArrayBuffer.lift(
      uniffiCaller.rustCall(
        /*caller:*/ (callStatus) => {
          return nativeModule().ubrn_uniffi_foobar_fn_method_convomanager_get_key_package(
            uniffiTypeConvoManagerObjectFactory.clonePointer(this),
            callStatus
          );
        },
        /*liftString:*/ FfiConverterString.lift
      )
    );
  }

  public getPartialGroup(groupId: ArrayBuffer): LocalGroupWrapper {
    return FfiConverterTypeLocalGroupWrapper.lift(
      uniffiCaller.rustCall(
        /*caller:*/ (callStatus) => {
          return nativeModule().ubrn_uniffi_foobar_fn_method_convomanager_get_partial_group(
            uniffiTypeConvoManagerObjectFactory.clonePointer(this),
            FfiConverterArrayBuffer.lower(groupId),
            callStatus
          );
        },
        /*liftString:*/ FfiConverterString.lift
      )
    );
  }

  public getPendingInvites(): Array<ConvoInviteWrapper> {
    return FfiConverterArrayTypeConvoInviteWrapper.lift(
      uniffiCaller.rustCall(
        /*caller:*/ (callStatus) => {
          return nativeModule().ubrn_uniffi_foobar_fn_method_convomanager_get_pending_invites(
            uniffiTypeConvoManagerObjectFactory.clonePointer(this),
            callStatus
          );
        },
        /*liftString:*/ FfiConverterString.lift
      )
    );
  }

  public groupGetEpoch(groupId: ArrayBuffer): /*u64*/ bigint {
    return FfiConverterUInt64.lift(
      uniffiCaller.rustCall(
        /*caller:*/ (callStatus) => {
          return nativeModule().ubrn_uniffi_foobar_fn_method_convomanager_group_get_epoch(
            uniffiTypeConvoManagerObjectFactory.clonePointer(this),
            FfiConverterArrayBuffer.lower(groupId),
            callStatus
          );
        },
        /*liftString:*/ FfiConverterString.lift
      )
    );
  }

  public groupGetIndex(groupId: ArrayBuffer): /*u64*/ bigint {
    return FfiConverterUInt64.lift(
      uniffiCaller.rustCall(
        /*caller:*/ (callStatus) => {
          return nativeModule().ubrn_uniffi_foobar_fn_method_convomanager_group_get_index(
            uniffiTypeConvoManagerObjectFactory.clonePointer(this),
            FfiConverterArrayBuffer.lower(groupId),
            callStatus
          );
        },
        /*liftString:*/ FfiConverterString.lift
      )
    );
  }

  public groupPushMessage(
    groupId: ArrayBuffer,
    message: string,
    senderId: string
  ): void {
    uniffiCaller.rustCall(
      /*caller:*/ (callStatus) => {
        nativeModule().ubrn_uniffi_foobar_fn_method_convomanager_group_push_message(
          uniffiTypeConvoManagerObjectFactory.clonePointer(this),
          FfiConverterArrayBuffer.lower(groupId),
          FfiConverterString.lower(message),
          FfiConverterString.lower(senderId),
          callStatus
        );
      },
      /*liftString:*/ FfiConverterString.lift
    );
  }

  public groupSetIndex(groupId: ArrayBuffer, index: /*u64*/ bigint): void {
    uniffiCaller.rustCall(
      /*caller:*/ (callStatus) => {
        nativeModule().ubrn_uniffi_foobar_fn_method_convomanager_group_set_index(
          uniffiTypeConvoManagerObjectFactory.clonePointer(this),
          FfiConverterArrayBuffer.lower(groupId),
          FfiConverterUInt64.lower(index),
          callStatus
        );
      },
      /*liftString:*/ FfiConverterString.lift
    );
  }

  public loadState(state: SerializedCredentialsWrapper): void {
    uniffiCaller.rustCall(
      /*caller:*/ (callStatus) => {
        nativeModule().ubrn_uniffi_foobar_fn_method_convomanager_load_state(
          uniffiTypeConvoManagerObjectFactory.clonePointer(this),
          FfiConverterTypeSerializedCredentialsWrapper.lower(state),
          callStatus
        );
      },
      /*liftString:*/ FfiConverterString.lift
    );
  }

  public processConvoMessages(
    messages: Array<ConvoMessageWrapper>,
    groupId: ArrayBuffer | undefined
  ): void {
    uniffiCaller.rustCall(
      /*caller:*/ (callStatus) => {
        nativeModule().ubrn_uniffi_foobar_fn_method_convomanager_process_convo_messages(
          uniffiTypeConvoManagerObjectFactory.clonePointer(this),
          FfiConverterArrayTypeConvoMessageWrapper.lower(messages),
          FfiConverterOptionalArrayBuffer.lower(groupId),
          callStatus
        );
      },
      /*liftString:*/ FfiConverterString.lift
    );
  }

  public processMessage(
    message: ArrayBuffer,
    senderId: string | undefined
  ): ProcessedResultsWrapper {
    return FfiConverterTypeProcessedResultsWrapper.lift(
      uniffiCaller.rustCall(
        /*caller:*/ (callStatus) => {
          return nativeModule().ubrn_uniffi_foobar_fn_method_convomanager_process_message(
            uniffiTypeConvoManagerObjectFactory.clonePointer(this),
            FfiConverterArrayBuffer.lower(message),
            FfiConverterOptionalString.lower(senderId),
            callStatus
          );
        },
        /*liftString:*/ FfiConverterString.lift
      )
    );
  }

  public processRawInvite(
    senderId: string,
    groupName: string,
    welcomeMessage: ArrayBuffer,
    ratchetTree: ArrayBuffer | undefined,
    keyPackage: ArrayBuffer | undefined
  ): void {
    uniffiCaller.rustCall(
      /*caller:*/ (callStatus) => {
        nativeModule().ubrn_uniffi_foobar_fn_method_convomanager_process_raw_invite(
          uniffiTypeConvoManagerObjectFactory.clonePointer(this),
          FfiConverterString.lower(senderId),
          FfiConverterString.lower(groupName),
          FfiConverterArrayBuffer.lower(welcomeMessage),
          FfiConverterOptionalArrayBuffer.lower(ratchetTree),
          FfiConverterOptionalArrayBuffer.lower(keyPackage),
          callStatus
        );
      },
      /*liftString:*/ FfiConverterString.lift
    );
  }

  public saveState(): SerializedCredentialsWrapper {
    return FfiConverterTypeSerializedCredentialsWrapper.lift(
      uniffiCaller.rustCall(
        /*caller:*/ (callStatus) => {
          return nativeModule().ubrn_uniffi_foobar_fn_method_convomanager_save_state(
            uniffiTypeConvoManagerObjectFactory.clonePointer(this),
            callStatus
          );
        },
        /*liftString:*/ FfiConverterString.lift
      )
    );
  }

  /**
   * {@inheritDoc uniffi-bindgen-react-native#UniffiAbstractObject.uniffiDestroy}
   */
  uniffiDestroy(): void {
    const ptr = (this as any)[destructorGuardSymbol];
    if (ptr !== undefined) {
      const pointer = uniffiTypeConvoManagerObjectFactory.pointer(this);
      uniffiTypeConvoManagerObjectFactory.freePointer(pointer);
      uniffiTypeConvoManagerObjectFactory.unbless(ptr);
      delete (this as any)[destructorGuardSymbol];
    }
  }

  static instanceOf(obj: any): obj is ConvoManager {
    return uniffiTypeConvoManagerObjectFactory.isConcreteType(obj);
  }
}

const uniffiTypeConvoManagerObjectFactory: UniffiObjectFactory<ConvoManagerInterface> =
  {
    create(pointer: UnsafeMutableRawPointer): ConvoManagerInterface {
      const instance = Object.create(ConvoManager.prototype);
      instance[pointerLiteralSymbol] = pointer;
      instance[destructorGuardSymbol] = this.bless(pointer);
      instance[uniffiTypeNameSymbol] = 'ConvoManager';
      return instance;
    },

    bless(p: UnsafeMutableRawPointer): UniffiRustArcPtr {
      return uniffiCaller.rustCall(
        /*caller:*/ (status) =>
          nativeModule().ubrn_uniffi_internal_fn_method_convomanager_ffi__bless_pointer(
            p,
            status
          ),
        /*liftString:*/ FfiConverterString.lift
      );
    },

    unbless(ptr: UniffiRustArcPtr) {
      ptr.markDestroyed();
    },

    pointer(obj: ConvoManagerInterface): UnsafeMutableRawPointer {
      if ((obj as any)[destructorGuardSymbol] === undefined) {
        throw new UniffiInternalError.UnexpectedNullPointer();
      }
      return (obj as any)[pointerLiteralSymbol];
    },

    clonePointer(obj: ConvoManagerInterface): UnsafeMutableRawPointer {
      const pointer = this.pointer(obj);
      return uniffiCaller.rustCall(
        /*caller:*/ (callStatus) =>
          nativeModule().ubrn_uniffi_foobar_fn_clone_convomanager(
            pointer,
            callStatus
          ),
        /*liftString:*/ FfiConverterString.lift
      );
    },

    freePointer(pointer: UnsafeMutableRawPointer): void {
      uniffiCaller.rustCall(
        /*caller:*/ (callStatus) =>
          nativeModule().ubrn_uniffi_foobar_fn_free_convomanager(
            pointer,
            callStatus
          ),
        /*liftString:*/ FfiConverterString.lift
      );
    },

    isConcreteType(obj: any): obj is ConvoManagerInterface {
      return (
        obj[destructorGuardSymbol] &&
        obj[uniffiTypeNameSymbol] === 'ConvoManager'
      );
    },
  };
// FfiConverter for ConvoManagerInterface
const FfiConverterTypeConvoManager = new FfiConverterObject(
  uniffiTypeConvoManagerObjectFactory
);

// FfiConverter for ArrayBuffer | undefined
const FfiConverterOptionalArrayBuffer = new FfiConverterOptional(
  FfiConverterArrayBuffer
);

// FfiConverter for ConvoInviteWrapper | undefined
const FfiConverterOptionalTypeConvoInviteWrapper = new FfiConverterOptional(
  FfiConverterTypeConvoInviteWrapper
);

// FfiConverter for string | undefined
const FfiConverterOptionalString = new FfiConverterOptional(FfiConverterString);

// FfiConverter for Array<ConvoInviteWrapper>
const FfiConverterArrayTypeConvoInviteWrapper = new FfiConverterArray(
  FfiConverterTypeConvoInviteWrapper
);

// FfiConverter for Array<ConvoMessageWrapper>
const FfiConverterArrayTypeConvoMessageWrapper = new FfiConverterArray(
  FfiConverterTypeConvoMessageWrapper
);

// FfiConverter for Array<MessageItemWrapper>
const FfiConverterArrayTypeMessageItemWrapper = new FfiConverterArray(
  FfiConverterTypeMessageItemWrapper
);

// FfiConverter for Array<string>
const FfiConverterArrayString = new FfiConverterArray(FfiConverterString);

/**
 * This should be called before anything else.
 *
 * It is likely that this is being done for you by the library's `index.ts`.
 *
 * It checks versions of uniffi between when the Rust scaffolding was generated
 * and when the bindings were generated.
 *
 * It also initializes the machinery to enable Rust to talk back to Javascript.
 */
function uniffiEnsureInitialized() {
  // Get the bindings contract version from our ComponentInterface
  const bindingsContractVersion = 26;
  // Get the scaffolding contract version by calling the into the dylib
  const scaffoldingContractVersion =
    nativeModule().ubrn_ffi_foobar_uniffi_contract_version();
  if (bindingsContractVersion !== scaffoldingContractVersion) {
    throw new UniffiInternalError.ContractVersionMismatch(
      scaffoldingContractVersion,
      bindingsContractVersion
    );
  }
  if (
    nativeModule().ubrn_uniffi_foobar_checksum_method_convomanager_create_invite() !==
    50076
  ) {
    throw new UniffiInternalError.ApiChecksumMismatch(
      'uniffi_foobar_checksum_method_convomanager_create_invite'
    );
  }
  if (
    nativeModule().ubrn_uniffi_foobar_checksum_method_convomanager_create_message() !==
    101
  ) {
    throw new UniffiInternalError.ApiChecksumMismatch(
      'uniffi_foobar_checksum_method_convomanager_create_message'
    );
  }
  if (
    nativeModule().ubrn_uniffi_foobar_checksum_method_convomanager_create_new_group() !==
    44787
  ) {
    throw new UniffiInternalError.ApiChecksumMismatch(
      'uniffi_foobar_checksum_method_convomanager_create_new_group'
    );
  }
  if (
    nativeModule().ubrn_uniffi_foobar_checksum_method_convomanager_get_key_package() !==
    58549
  ) {
    throw new UniffiInternalError.ApiChecksumMismatch(
      'uniffi_foobar_checksum_method_convomanager_get_key_package'
    );
  }
  if (
    nativeModule().ubrn_uniffi_foobar_checksum_method_convomanager_get_partial_group() !==
    51255
  ) {
    throw new UniffiInternalError.ApiChecksumMismatch(
      'uniffi_foobar_checksum_method_convomanager_get_partial_group'
    );
  }
  if (
    nativeModule().ubrn_uniffi_foobar_checksum_method_convomanager_get_pending_invites() !==
    33098
  ) {
    throw new UniffiInternalError.ApiChecksumMismatch(
      'uniffi_foobar_checksum_method_convomanager_get_pending_invites'
    );
  }
  if (
    nativeModule().ubrn_uniffi_foobar_checksum_method_convomanager_group_get_epoch() !==
    17970
  ) {
    throw new UniffiInternalError.ApiChecksumMismatch(
      'uniffi_foobar_checksum_method_convomanager_group_get_epoch'
    );
  }
  if (
    nativeModule().ubrn_uniffi_foobar_checksum_method_convomanager_group_get_index() !==
    56153
  ) {
    throw new UniffiInternalError.ApiChecksumMismatch(
      'uniffi_foobar_checksum_method_convomanager_group_get_index'
    );
  }
  if (
    nativeModule().ubrn_uniffi_foobar_checksum_method_convomanager_group_push_message() !==
    12963
  ) {
    throw new UniffiInternalError.ApiChecksumMismatch(
      'uniffi_foobar_checksum_method_convomanager_group_push_message'
    );
  }
  if (
    nativeModule().ubrn_uniffi_foobar_checksum_method_convomanager_group_set_index() !==
    13168
  ) {
    throw new UniffiInternalError.ApiChecksumMismatch(
      'uniffi_foobar_checksum_method_convomanager_group_set_index'
    );
  }
  if (
    nativeModule().ubrn_uniffi_foobar_checksum_method_convomanager_load_state() !==
    33161
  ) {
    throw new UniffiInternalError.ApiChecksumMismatch(
      'uniffi_foobar_checksum_method_convomanager_load_state'
    );
  }
  if (
    nativeModule().ubrn_uniffi_foobar_checksum_method_convomanager_process_convo_messages() !==
    42325
  ) {
    throw new UniffiInternalError.ApiChecksumMismatch(
      'uniffi_foobar_checksum_method_convomanager_process_convo_messages'
    );
  }
  if (
    nativeModule().ubrn_uniffi_foobar_checksum_method_convomanager_process_message() !==
    22503
  ) {
    throw new UniffiInternalError.ApiChecksumMismatch(
      'uniffi_foobar_checksum_method_convomanager_process_message'
    );
  }
  if (
    nativeModule().ubrn_uniffi_foobar_checksum_method_convomanager_process_raw_invite() !==
    54618
  ) {
    throw new UniffiInternalError.ApiChecksumMismatch(
      'uniffi_foobar_checksum_method_convomanager_process_raw_invite'
    );
  }
  if (
    nativeModule().ubrn_uniffi_foobar_checksum_method_convomanager_save_state() !==
    12640
  ) {
    throw new UniffiInternalError.ApiChecksumMismatch(
      'uniffi_foobar_checksum_method_convomanager_save_state'
    );
  }
  if (
    nativeModule().ubrn_uniffi_foobar_checksum_constructor_convomanager_new() !==
    51625
  ) {
    throw new UniffiInternalError.ApiChecksumMismatch(
      'uniffi_foobar_checksum_constructor_convomanager_new'
    );
  }
}

export default Object.freeze({
  initialize: uniffiEnsureInitialized,
  converters: {
    FfiConverterTypeConvoInviteWrapper,
    FfiConverterTypeConvoManager,
    FfiConverterTypeConvoMessageWrapper,
    FfiConverterTypeLocalGroupWrapper,
    FfiConverterTypeMessageItemWrapper,
    FfiConverterTypeProcessedResultsWrapper,
    FfiConverterTypeSerializedCredentialsWrapper,
  },
});
