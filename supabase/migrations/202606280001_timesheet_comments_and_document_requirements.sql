-- Add one optional comment for the whole timesheet without removing legacy
-- per-entry notes, and complete the shared production document requirements.

alter table public.timesheets
add column if not exists comments text;

insert into public.document_requirements (
  supplier_type,
  name,
  is_required,
  requires_expiry_date
)
select null, value.name, value.is_required, false
from (
  values
    ('Contractor Agreement', true),
    ('NDA', true),
    ('Assignment Schedule', true),
    ('Other', false)
) as value(name, is_required)
where not exists (
  select 1
  from public.document_requirements existing
  where existing.supplier_type is null
    and lower(existing.name) = lower(value.name)
);
