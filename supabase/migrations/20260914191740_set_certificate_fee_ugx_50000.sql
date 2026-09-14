insert into public.platform_settings (setting_key, setting_value, description)
values (
  'certificate_fee_ugx',
  '{"amount":50000,"currency":"UGX","applies_where_required":true}'::jsonb,
  'DIRI certificate fee. Certification requires qualification and approval.'
)
on conflict (setting_key) do update
set setting_value = excluded.setting_value,
    description = excluded.description,
    updated_at = now();
