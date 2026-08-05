// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'api_envelope.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

_$ApiEnvelopeImpl<T> _$$ApiEnvelopeImplFromJson<T>(
  Map<String, dynamic> json,
  T Function(Object? json) fromJsonT,
) => _$ApiEnvelopeImpl<T>(
  data: fromJsonT(json['data']),
  meta: json['meta'] as Map<String, dynamic>?,
);

Map<String, dynamic> _$$ApiEnvelopeImplToJson<T>(
  _$ApiEnvelopeImpl<T> instance,
  Object? Function(T value) toJsonT,
) => <String, dynamic>{'data': toJsonT(instance.data), 'meta': instance.meta};
