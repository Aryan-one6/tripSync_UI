// coverage:ignore-file
// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint
// ignore_for_file: unused_element, deprecated_member_use, deprecated_member_use_from_same_package, use_function_type_syntax_for_parameters, unnecessary_const, avoid_init_to_null, invalid_override_different_default_values_named, prefer_expression_function_bodies, annotate_overrides, invalid_annotation_target, unnecessary_question_mark

part of 'api_envelope.dart';

// **************************************************************************
// FreezedGenerator
// **************************************************************************

T _$identity<T>(T value) => value;

final _privateConstructorUsedError = UnsupportedError(
  'It seems like you constructed your class using `MyClass._()`. This constructor is only meant to be used by freezed and you are not supposed to need it nor use it.\nPlease check the documentation here for more information: https://github.com/rrousselGit/freezed#adding-getters-and-methods-to-our-models',
);

ApiEnvelope<T> _$ApiEnvelopeFromJson<T>(
  Map<String, dynamic> json,
  T Function(Object?) fromJsonT,
) {
  return _ApiEnvelope<T>.fromJson(json, fromJsonT);
}

/// @nodoc
mixin _$ApiEnvelope<T> {
  T get data => throw _privateConstructorUsedError;
  Map<String, Object?>? get meta => throw _privateConstructorUsedError;

  /// Serializes this ApiEnvelope to a JSON map.
  Map<String, dynamic> toJson(Object? Function(T) toJsonT) =>
      throw _privateConstructorUsedError;

  /// Create a copy of ApiEnvelope
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  $ApiEnvelopeCopyWith<T, ApiEnvelope<T>> get copyWith =>
      throw _privateConstructorUsedError;
}

/// @nodoc
abstract class $ApiEnvelopeCopyWith<T, $Res> {
  factory $ApiEnvelopeCopyWith(
    ApiEnvelope<T> value,
    $Res Function(ApiEnvelope<T>) then,
  ) = _$ApiEnvelopeCopyWithImpl<T, $Res, ApiEnvelope<T>>;
  @useResult
  $Res call({T data, Map<String, Object?>? meta});
}

/// @nodoc
class _$ApiEnvelopeCopyWithImpl<T, $Res, $Val extends ApiEnvelope<T>>
    implements $ApiEnvelopeCopyWith<T, $Res> {
  _$ApiEnvelopeCopyWithImpl(this._value, this._then);

  // ignore: unused_field
  final $Val _value;
  // ignore: unused_field
  final $Res Function($Val) _then;

  /// Create a copy of ApiEnvelope
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({Object? data = freezed, Object? meta = freezed}) {
    return _then(
      _value.copyWith(
            data: freezed == data
                ? _value.data
                : data // ignore: cast_nullable_to_non_nullable
                      as T,
            meta: freezed == meta
                ? _value.meta
                : meta // ignore: cast_nullable_to_non_nullable
                      as Map<String, Object?>?,
          )
          as $Val,
    );
  }
}

/// @nodoc
abstract class _$$ApiEnvelopeImplCopyWith<T, $Res>
    implements $ApiEnvelopeCopyWith<T, $Res> {
  factory _$$ApiEnvelopeImplCopyWith(
    _$ApiEnvelopeImpl<T> value,
    $Res Function(_$ApiEnvelopeImpl<T>) then,
  ) = __$$ApiEnvelopeImplCopyWithImpl<T, $Res>;
  @override
  @useResult
  $Res call({T data, Map<String, Object?>? meta});
}

/// @nodoc
class __$$ApiEnvelopeImplCopyWithImpl<T, $Res>
    extends _$ApiEnvelopeCopyWithImpl<T, $Res, _$ApiEnvelopeImpl<T>>
    implements _$$ApiEnvelopeImplCopyWith<T, $Res> {
  __$$ApiEnvelopeImplCopyWithImpl(
    _$ApiEnvelopeImpl<T> _value,
    $Res Function(_$ApiEnvelopeImpl<T>) _then,
  ) : super(_value, _then);

  /// Create a copy of ApiEnvelope
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({Object? data = freezed, Object? meta = freezed}) {
    return _then(
      _$ApiEnvelopeImpl<T>(
        data: freezed == data
            ? _value.data
            : data // ignore: cast_nullable_to_non_nullable
                  as T,
        meta: freezed == meta
            ? _value._meta
            : meta // ignore: cast_nullable_to_non_nullable
                  as Map<String, Object?>?,
      ),
    );
  }
}

/// @nodoc
@JsonSerializable(genericArgumentFactories: true)
class _$ApiEnvelopeImpl<T> implements _ApiEnvelope<T> {
  const _$ApiEnvelopeImpl({
    required this.data,
    final Map<String, Object?>? meta,
  }) : _meta = meta;

  factory _$ApiEnvelopeImpl.fromJson(
    Map<String, dynamic> json,
    T Function(Object?) fromJsonT,
  ) => _$$ApiEnvelopeImplFromJson(json, fromJsonT);

  @override
  final T data;
  final Map<String, Object?>? _meta;
  @override
  Map<String, Object?>? get meta {
    final value = _meta;
    if (value == null) return null;
    if (_meta is EqualUnmodifiableMapView) return _meta;
    // ignore: implicit_dynamic_type
    return EqualUnmodifiableMapView(value);
  }

  @override
  String toString() {
    return 'ApiEnvelope<$T>(data: $data, meta: $meta)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$ApiEnvelopeImpl<T> &&
            const DeepCollectionEquality().equals(other.data, data) &&
            const DeepCollectionEquality().equals(other._meta, _meta));
  }

  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  int get hashCode => Object.hash(
    runtimeType,
    const DeepCollectionEquality().hash(data),
    const DeepCollectionEquality().hash(_meta),
  );

  /// Create a copy of ApiEnvelope
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  @pragma('vm:prefer-inline')
  _$$ApiEnvelopeImplCopyWith<T, _$ApiEnvelopeImpl<T>> get copyWith =>
      __$$ApiEnvelopeImplCopyWithImpl<T, _$ApiEnvelopeImpl<T>>(
        this,
        _$identity,
      );

  @override
  Map<String, dynamic> toJson(Object? Function(T) toJsonT) {
    return _$$ApiEnvelopeImplToJson<T>(this, toJsonT);
  }
}

abstract class _ApiEnvelope<T> implements ApiEnvelope<T> {
  const factory _ApiEnvelope({
    required final T data,
    final Map<String, Object?>? meta,
  }) = _$ApiEnvelopeImpl<T>;

  factory _ApiEnvelope.fromJson(
    Map<String, dynamic> json,
    T Function(Object?) fromJsonT,
  ) = _$ApiEnvelopeImpl<T>.fromJson;

  @override
  T get data;
  @override
  Map<String, Object?>? get meta;

  /// Create a copy of ApiEnvelope
  /// with the given fields replaced by the non-null parameter values.
  @override
  @JsonKey(includeFromJson: false, includeToJson: false)
  _$$ApiEnvelopeImplCopyWith<T, _$ApiEnvelopeImpl<T>> get copyWith =>
      throw _privateConstructorUsedError;
}
