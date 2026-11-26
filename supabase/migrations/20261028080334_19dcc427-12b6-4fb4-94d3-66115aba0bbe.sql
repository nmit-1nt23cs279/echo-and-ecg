create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path=public as $$
declare _type text := case when new.raw_user_meta_data->>'account_type'='medical_professional' then 'medical_professional' else 'patient' end;
begin
 insert into public.profiles(id,full_name,email,account_type) values(new.id,left(coalesce(new.raw_user_meta_data->>'full_name',''),200),new.email,_type);
 -- Only the two non-admin registration roles are permitted. Ignore all other metadata.
 if _type='medical_professional' then
  insert into public.user_roles(user_id,role) values(new.id,'medical_professional');
  insert into public.professional_requests(user_id,qualifications) values(new.id,left(coalesce(new.raw_user_meta_data->>'qualifications',''),2000));
 else
  insert into public.user_roles(user_id,role) values(new.id,'patient');
 end if;
 return new;
end $$;
revoke all on function public.handle_new_user() from public,anon,authenticated;

create or replace function cardiofusion_private.has_patient_access(_professional uuid,_patient uuid) returns boolean language sql stable security definer set search_path=public as $$
 select cardiofusion_private.has_role(_professional,'medical_professional')
 and exists(select 1 from public.patient_access_grants where professional_id=_professional and patient_id=_patient)
$$;

create or replace function cardiofusion_private.grant_professional_access(_email text) returns uuid language plpgsql security definer set search_path=public as $$
declare _pro uuid; _id uuid;
begin
 if auth.uid() is null or not cardiofusion_private.has_role(auth.uid(),'patient') then raise exception 'Patient privileges required'; end if;
 select p.id into _pro from public.profiles p where lower(p.email)=lower(trim(_email)) and cardiofusion_private.has_role(p.id,'medical_professional');
 if _pro is null then raise exception 'No medical professional found with that email'; end if;
 if _pro=auth.uid() then raise exception 'You cannot grant access to yourself'; end if;
 insert into public.patient_access_grants(patient_id,professional_id) values(auth.uid(),_pro) on conflict(patient_id,professional_id) do update set created_at=excluded.created_at returning id into _id;
 return _id;
end $$;
revoke all on function cardiofusion_private.has_patient_access(uuid,uuid),cardiofusion_private.grant_professional_access(text) from public,anon;
grant execute on function cardiofusion_private.has_patient_access(uuid,uuid),cardiofusion_private.grant_professional_access(text) to authenticated;
grant execute on function cardiofusion_private.has_patient_access(uuid,uuid) to service_role;

drop policy requests_own_pending_update on public.professional_requests;
create policy requests_own_details_update on public.professional_requests for update to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());
-- Existing column grants still forbid editing status, reviewed_by, or review_note.

create or replace function cardiofusion_private.admin_stats() returns json language plpgsql stable security definer set search_path=public as $$
begin
 if not cardiofusion_private.has_role(auth.uid(),'admin') then raise exception 'admin privileges required'; end if;
 return json_build_object('users',(select count(*) from public.profiles),'patients',(select count(*) from public.profiles where account_type='patient'),'professionals',(select count(*) from public.user_roles where role='medical_professional'),'assessments',(select count(*) from public.assessments),'completed_assessments',(select count(*) from public.assessments where status='completed'),'uploads',(select count(*) from public.medical_uploads));
end $$;