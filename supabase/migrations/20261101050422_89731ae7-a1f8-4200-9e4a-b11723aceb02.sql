create table public.browser_predictions (
  id uuid primary key default gen_random_uuid(),
  assessment_id uuid not null references public.assessments(id) on delete cascade,
  upload_id uuid not null references public.medical_uploads(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  kind text not null check (kind in ('ecg','echo')),
  status text not null check (status in ('completed','failed')),
  result jsonb,
  error text,
  model_version text not null default 'browser-tfjs',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (assessment_id, kind)
);

grant select, insert, update, delete on public.browser_predictions to authenticated;
grant all on public.browser_predictions to service_role;

alter table public.browser_predictions enable row level security;

create policy bp_owner_read on public.browser_predictions for select to authenticated using (user_id = auth.uid());
create policy bp_professional_read on public.browser_predictions for select to authenticated using (public.has_patient_access(auth.uid(), user_id));
create policy bp_owner_insert on public.browser_predictions for insert to authenticated with check (user_id = auth.uid() and exists (select 1 from public.assessments a where a.id = assessment_id and a.user_id = auth.uid()));
create policy bp_owner_update on public.browser_predictions for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy bp_owner_delete on public.browser_predictions for delete to authenticated using (user_id = auth.uid());

create function public.browser_predictions_guard() returns trigger language plpgsql set search_path = public as $$
begin
  if not exists (
    select 1 from public.medical_uploads u
    where u.id = new.upload_id
      and u.assessment_id = new.assessment_id
      and u.user_id = new.user_id
      and u.kind = case new.kind when 'ecg' then 'ecg_csv' else 'echo_image' end
  ) then
    raise exception 'upload does not match this assessment, owner, and analysis kind';
  end if;
  if new.status = 'completed' then
    if new.result is null then raise exception 'completed prediction requires a result'; end if;
    if new.kind = 'ecg' then
      if jsonb_typeof(new.result) <> 'object'
        or jsonb_typeof(new.result->'output') <> 'number'
        or (new.result->>'output')::float8 < 0 or (new.result->>'output')::float8 > 1
        or jsonb_typeof(new.result->'predicted_index') <> 'number'
        or (new.result->>'predicted_index')::int not in (0, 1)
        or jsonb_typeof(new.result->'threshold') <> 'number'
        or (new.result->>'threshold')::float8 < 0 or (new.result->>'threshold')::float8 > 1
      then raise exception 'invalid ECG result payload'; end if;
    else
      if jsonb_typeof(new.result) <> 'object'
        or jsonb_typeof(new.result->'probabilities') <> 'array'
        or jsonb_array_length(new.result->'probabilities') <> 4
        or exists (
          select 1 from jsonb_array_elements(new.result->'probabilities') p
          where jsonb_typeof(p->'probability') <> 'number'
            or (p->>'probability')::float8 < 0 or (p->>'probability')::float8 > 1
        )
        or jsonb_typeof(new.result->'predicted_index') <> 'number'
        or (new.result->>'predicted_index')::int not between 0 and 3
      then raise exception 'invalid ECHO result payload'; end if;
    end if;
  elsif new.status = 'failed' then
    if new.error is null or length(trim(new.error)) = 0 then raise exception 'failed prediction requires an error message'; end if;
    new.result = null;
  end if;
  return new;
end $$;

create trigger browser_predictions_guard before insert or update on public.browser_predictions for each row execute function public.browser_predictions_guard();
create trigger browser_predictions_touch before update on public.browser_predictions for each row execute function public.touch_updated_at();

create index browser_predictions_assessment_idx on public.browser_predictions(assessment_id);
create index browser_predictions_user_idx on public.browser_predictions(user_id);

create table public.professional_reviews (
  id uuid primary key default gen_random_uuid(),
  assessment_id uuid not null references public.assessments(id) on delete cascade,
  professional_id uuid not null references public.profiles(id) on delete cascade,
  ecg_interpretation text not null default '',
  echo_interpretation text not null default '',
  overall_assessment text not null default '',
  clinical_observations text not null default '',
  further_investigations text not null default '',
  follow_up text not null default '',
  recommendations text not null default '',
  notes text not null default '',
  status text not null default 'draft' check (status in ('draft','completed')),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (assessment_id, professional_id)
);

grant select, insert, update on public.professional_reviews to authenticated;
grant all on public.professional_reviews to service_role;

alter table public.professional_reviews enable row level security;

create policy pr_patient_read on public.professional_reviews for select to authenticated using (exists (select 1 from public.assessments a where a.id = assessment_id and a.user_id = auth.uid()));
create policy pr_professional_read on public.professional_reviews for select to authenticated using (exists (select 1 from public.assessments a where a.id = assessment_id and public.has_patient_access(auth.uid(), a.user_id)));
create policy pr_professional_insert on public.professional_reviews for insert to authenticated with check (
  professional_id = auth.uid()
  and public.has_role(auth.uid(), 'medical_professional')
  and exists (select 1 from public.assessments a where a.id = assessment_id and public.has_patient_access(auth.uid(), a.user_id))
);
create policy pr_professional_update on public.professional_reviews for update to authenticated using (
  professional_id = auth.uid()
  and exists (select 1 from public.assessments a where a.id = assessment_id and public.has_patient_access(auth.uid(), a.user_id))
) with check (
  professional_id = auth.uid()
  and exists (select 1 from public.assessments a where a.id = assessment_id and public.has_patient_access(auth.uid(), a.user_id))
);

create function public.professional_reviews_guard() returns trigger language plpgsql set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    new.professional_id = auth.uid();
  elsif new.professional_id is distinct from old.professional_id or new.assessment_id is distinct from old.assessment_id then
    raise exception 'review author and assessment cannot be changed';
  end if;
  if new.status = 'completed' and (tg_op = 'INSERT' or old.status is distinct from 'completed') then
    new.completed_at = now();
  elsif new.status <> 'completed' then
    new.completed_at = null;
  end if;
  return new;
end $$;

create trigger professional_reviews_guard before insert or update on public.professional_reviews for each row execute function public.professional_reviews_guard();
create trigger professional_reviews_touch before update on public.professional_reviews for each row execute function public.touch_updated_at();

create index professional_reviews_assessment_idx on public.professional_reviews(assessment_id);
create index professional_reviews_professional_idx on public.professional_reviews(professional_id);

revoke all on function public.browser_predictions_guard(), public.professional_reviews_guard() from public, anon;