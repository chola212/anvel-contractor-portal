-- Split address fields while keeping legacy combined fields populated.

alter table public.company_invoice_settings
  add column if not exists company_address_line_1 text,
  add column if not exists company_address_line_2 text;

alter table public.project_billing_details
  add column if not exists billing_address_line_1 text,
  add column if not exists billing_address_line_2 text;

alter table public.contractors
  add column if not exists fiscal_address_line_1 text,
  add column if not exists fiscal_address_line_2 text;

alter table public.outgoing_invoices
  add column if not exists company_address_line_1 text,
  add column if not exists company_address_line_2 text,
  add column if not exists billing_address_line_1 text,
  add column if not exists billing_address_line_2 text;

update public.company_invoice_settings
set company_address_line_1 = company_address
where company_address_line_1 is null
  and company_address is not null;

update public.project_billing_details
set billing_address_line_1 = billing_address
where billing_address_line_1 is null
  and billing_address is not null;

update public.contractors
set fiscal_address_line_1 = fiscal_address
where fiscal_address_line_1 is null
  and fiscal_address is not null;

update public.outgoing_invoices
set
  company_address_line_1 = company_address,
  billing_address_line_1 = billing_address
where (
    company_address_line_1 is null
    and company_address is not null
  )
  or (
    billing_address_line_1 is null
    and billing_address is not null
  );

create or replace function public.update_own_contractor_profile(
  p_legal_name text,
  p_trading_name text,
  p_phone text,
  p_country text,
  p_supplier_type text,
  p_company_registration_number text,
  p_vat_number text,
  p_tax_number text,
  p_fiscal_address text,
  p_vat_treatment text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  current_contractor public.contractors%rowtype;
  updated_contractor_id uuid;
  next_legal_name text := nullif(btrim(p_legal_name), '');
  next_trading_name text := nullif(btrim(p_trading_name), '');
  next_phone text := nullif(btrim(p_phone), '');
  next_country text := nullif(btrim(p_country), '');
  next_supplier_type text := nullif(btrim(p_supplier_type), '');
  next_company_registration_number text := nullif(btrim(p_company_registration_number), '');
  next_vat_number text := nullif(btrim(p_vat_number), '');
  next_tax_number text := nullif(btrim(p_tax_number), '');
  next_fiscal_address text := nullif(btrim(p_fiscal_address), '');
  next_fiscal_address_line_1 text := nullif(btrim(split_part(coalesce(p_fiscal_address, ''), E'\n', 1)), '');
  next_fiscal_address_line_2 text := nullif(
    btrim(regexp_replace(coalesce(p_fiscal_address, ''), '^[^\n]*(\n)?', '')),
    ''
  );
  next_vat_treatment text := nullif(btrim(p_vat_treatment), '');
begin
  if public.current_user_role() <> 'contractor' then
    raise exception 'Only contractor users can update their own profile.';
  end if;

  if next_legal_name is null then
    raise exception 'Legal name is required.';
  end if;

  if char_length(next_legal_name) > 160 then
    raise exception 'Legal name is too long.';
  end if;

  if next_supplier_type is not null and next_supplier_type not in (
    'limited_company',
    'self_employed',
    'sole_trader',
    'other'
  ) then
    raise exception 'Supplier type is invalid.';
  end if;

  if next_vat_treatment is not null and next_vat_treatment not in (
    'eu_reverse_charge',
    'cyprus_vat_19',
    'non_eu_accountant_review',
    'eu_no_vat_accountant_review'
  ) then
    raise exception 'VAT treatment is invalid.';
  end if;

  select *
  into current_contractor
  from public.contractors
  where profile_id = auth.uid();

  if not found then
    raise exception 'Contractor profile not found.';
  end if;

  update public.contractors
  set
    legal_name = next_legal_name,
    trading_name = next_trading_name,
    phone = next_phone,
    country = next_country,
    supplier_type = next_supplier_type,
    company_registration_number = next_company_registration_number,
    vat_number = next_vat_number,
    tax_number = next_tax_number,
    fiscal_address = next_fiscal_address,
    fiscal_address_line_1 = next_fiscal_address_line_1,
    fiscal_address_line_2 = next_fiscal_address_line_2,
    vat_treatment = next_vat_treatment
  where id = current_contractor.id
  returning id into updated_contractor_id;

  insert into public.audit_logs (
    actor_profile_id,
    action,
    entity_type,
    entity_id,
    metadata
  )
  values (
    auth.uid(),
    'contractor_self_profile_updated',
    'contractor',
    current_contractor.id,
    jsonb_build_object(
      'before',
      jsonb_build_object(
        'legal_name', current_contractor.legal_name,
        'trading_name', current_contractor.trading_name,
        'phone', current_contractor.phone,
        'country', current_contractor.country,
        'supplier_type', current_contractor.supplier_type,
        'company_registration_number', current_contractor.company_registration_number,
        'vat_number', current_contractor.vat_number,
        'tax_number', current_contractor.tax_number,
        'fiscal_address', current_contractor.fiscal_address,
        'vat_treatment', current_contractor.vat_treatment
      ),
      'after',
      jsonb_build_object(
        'legal_name', next_legal_name,
        'trading_name', next_trading_name,
        'phone', next_phone,
        'country', next_country,
        'supplier_type', next_supplier_type,
        'company_registration_number', next_company_registration_number,
        'vat_number', next_vat_number,
        'tax_number', next_tax_number,
        'fiscal_address', next_fiscal_address,
        'vat_treatment', next_vat_treatment
      )
    )
  );

  return updated_contractor_id;
end;
$$;

select pg_notify('pgrst', 'reload schema');
