String? validateTrainingField(String field, String? raw) {
  final value = (raw ?? '').trim();
  if (field == 'additional_message') {
    return value.length > 3000
        ? 'Keep your message under 3,000 characters'
        : null;
  }
  if (value.isEmpty) return 'This field is required';
  if (field == 'participant_count') {
    final count = int.tryParse(value);
    return count == null || count < 1 || count > 10000
        ? 'Enter a whole number between 1 and 10,000'
        : null;
  }
  if (field == 'email') {
    return RegExp(
          r'^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$',
          caseSensitive: false,
        ).hasMatch(value)
        ? null
        : 'Enter a valid email';
  }
  final limits = <String, (int, int)>{
    'organization_name': (2, 160),
    'contact_person': (2, 100),
    'phone': (7, 30),
    'location': (2, 160),
    'training_topics': (5, 2000),
  };
  final limit = limits[field];
  if (limit != null && (value.length < limit.$1 || value.length > limit.$2)) {
    return 'Use between ${limit.$1} and ${limit.$2} characters';
  }
  return null;
}
