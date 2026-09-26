// DRF returns error fields two different ways depending on where they're
// raised: a plain string (e.g. `Response({'detail': '...'}, status=400)`
// from a plain APIView), or a list of strings (anything raised as
// `serializers.ValidationError({...})` from inside a serializer's
// `validate()` — DRF's `as_serializer_error` always wraps those in lists,
// see core.auth_serializers.DeviceAwareTokenObtainPairSerializer). This
// reads either shape the same way.
export function errorField(data, key) {
  const value = data?.[key];
  if (Array.isArray(value)) return value[0];
  return value;
}

export function errorDetail(err, fallback) {
  const data = err?.response?.data;
  if (!data) return fallback;
  return errorField(data, 'detail') || fallback;
}
