alter table public.professional_reviews add column professional_name text not null default '';

create or replace function public.professional_reviews_guard() returns trigger language plpgsql set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    new.professional_id = auth.uid();
    select left(p.full_name, 200) into new.professional_name from public.profiles p where p.id = auth.uid();
  elsif new.professional_id is distinct from old.professional_id or new.assessment_id is distinct from old.assessment_id then
    raise exception 'review author and assessment cannot be changed';
  else
    new.professional_name = old.professional_name;
  end if;
  if new.status = 'completed' and (tg_op = 'INSERT' or old.status is distinct from 'completed') then
    new.completed_at = now();
  elsif new.status <> 'completed' then
    new.completed_at = null;
  end if;
  return new;
end $$;