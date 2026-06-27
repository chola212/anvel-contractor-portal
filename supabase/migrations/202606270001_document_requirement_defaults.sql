-- Ensure core contractor document types are available for production uploads.

insert into public.document_requirements (supplier_type, name, is_required, requires_expiry_date)
select null, value.name, value.is_required, false
from (
  values
    ('Contractor Agreement', true),
    ('NDA', true),
    ('Bank details', true),
    ('Other', false)
) as value(name, is_required)
where not exists (
  select 1
  from public.document_requirements existing
  where existing.supplier_type is null
    and lower(existing.name) = lower(value.name)
);
