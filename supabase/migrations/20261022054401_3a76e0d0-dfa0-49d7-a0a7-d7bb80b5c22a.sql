create type public.app_role as enum ('patient','medical_professional','admin');

create table public.profiles (
 id uuid primary key references auth.users(id) on delete cascade,
 full_name text not null default '' check (char_length(full_name)<=200),
 email text not null,
 account_type text not null default 'patient' check (account_type in ('patient','medical_professional')),
 date_of_birth date check (date_of_birth is null or date_of_birth > date '1900-01-01'),
 sex text check (sex in ('female','male','other','prefer_not_to_say')),
 height_cm numeric(5,1) check (height_cm between 30 and 272),
 weight_kg numeric(5,1) check (weight_kg between 1 and 500),
 blood_group text check (blood_group in ('A+','A-','B+','B-','AB+','AB-','O+','O-')),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
grant select on public.profiles to authenticated;
grant update (full_name,date_of_birth,sex,height_cm,weight_kg,blood_group) on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;
create policy profiles_own_read on public.profiles for select to authenticated using (id=auth.uid());
create policy profiles_own_update on public.profiles for update to authenticated using (id=auth.uid()) with check (id=auth.uid());
create unique index profiles_email_idx on public.profiles(lower(email));

create table public.user_roles (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 role public.app_role not null, granted_by uuid references public.profiles(id) on delete set null,
 granted_at timestamptz not null default now(), unique(user_id,role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;
create policy roles_own_read on public.user_roles for select to authenticated using (user_id=auth.uid());
create index user_roles_granted_by_idx on public.user_roles(granted_by);

create table public.professional_requests (
 id uuid primary key default gen_random_uuid(), user_id uuid not null unique references public.profiles(id) on delete cascade,
 qualifications text not null default '' check(char_length(qualifications)<=2000),
 registration_number text check(char_length(registration_number)<=100), institution text check(char_length(institution)<=200),
 status text not null default 'pending' check(status in ('pending','approved','rejected')),
 review_note text check(char_length(review_note)<=1000), reviewed_by uuid references public.profiles(id) on delete set null,
 reviewed_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
grant select on public.professional_requests to authenticated;
grant update(qualifications,registration_number,institution) on public.professional_requests to authenticated;
grant all on public.professional_requests to service_role;
alter table public.professional_requests enable row level security;
create policy requests_own_read on public.professional_requests for select to authenticated using(user_id=auth.uid());
create policy requests_own_pending_update on public.professional_requests for update to authenticated using(user_id=auth.uid() and status='pending') with check(user_id=auth.uid() and status='pending');
create index professional_requests_status_idx on public.professional_requests(status);
create index professional_requests_reviewer_idx on public.professional_requests(reviewed_by);

create table public.health_profiles (
 user_id uuid primary key references public.profiles(id) on delete cascade,
 medical_history text check(char_length(medical_history)<=4000), hypertension boolean, diabetes boolean,
 cardiovascular_history text check(char_length(cardiovascular_history)<=4000), medications text check(char_length(medications)<=2000),
 allergies text check(char_length(allergies)<=2000), smoking_status text check(smoking_status in ('never','former','current','unknown')),
 family_history text check(char_length(family_history)<=2000), created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
grant select,insert,update,delete on public.health_profiles to authenticated;
grant all on public.health_profiles to service_role;
alter table public.health_profiles enable row level security;
create policy health_own on public.health_profiles for all to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());

create table public.symptom_reports (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles(id) on delete cascade,
 symptoms text[] not null default '{}', onset date, duration text check(char_length(duration)<=200),
 severity smallint check(severity between 0 and 10), notes text check(char_length(notes)<=4000),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
grant select,insert,delete on public.symptom_reports to authenticated;
grant all on public.symptom_reports to service_role;
alter table public.symptom_reports enable row level security;
create policy symptoms_own on public.symptom_reports for all to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());
create index symptom_reports_user_idx on public.symptom_reports(user_id,created_at desc);

create table public.assessments (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles(id) on delete cascade,
 symptom_report_id uuid references public.symptom_reports(id) on delete set null, ecg_upload_id uuid, echo_upload_id uuid,
 status text not null default 'draft' check(status in ('draft','completed')),
 current_step smallint not null default 1 check(current_step between 1 and 5),
 ecg_status text not null default 'not_provided' check(ecg_status in ('not_provided','pending','processing','completed','failed','unavailable')),
 ecg_result jsonb, ecg_model_version text, ecg_error text,
 echo_status text not null default 'not_provided' check(echo_status in ('not_provided','pending','processing','completed','failed','unavailable')),
 echo_result jsonb, echo_model_version text, echo_error text,
 fusion_status text not null default 'not_connected' check(fusion_status='not_connected'),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), completed_at timestamptz
);
grant select,delete on public.assessments to authenticated;
grant insert(user_id,symptom_report_id) on public.assessments to authenticated;
grant update(symptom_report_id,ecg_upload_id,echo_upload_id,status,current_step,ecg_status,echo_status,completed_at) on public.assessments to authenticated;
grant all on public.assessments to service_role;
alter table public.assessments enable row level security;
create policy assessments_own_read on public.assessments for select to authenticated using(user_id=auth.uid());
create policy assessments_own_insert on public.assessments for insert to authenticated with check(user_id=auth.uid() and (symptom_report_id is null or exists(select 1 from public.symptom_reports s where s.id=symptom_report_id and s.user_id=auth.uid())));
create policy assessments_own_update on public.assessments for update to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid() and (symptom_report_id is null or exists(select 1 from public.symptom_reports s where s.id=symptom_report_id and s.user_id=auth.uid())));
create policy assessments_own_delete on public.assessments for delete to authenticated using(user_id=auth.uid());
create index assessments_user_idx on public.assessments(user_id,created_at desc);
create index assessments_symptom_idx on public.assessments(symptom_report_id);

create table public.medical_uploads (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles(id) on delete cascade,
 assessment_id uuid not null references public.assessments(id) on delete cascade,
 kind text not null check(kind in ('ecg_csv','ecg_image','echo_image')), filename text not null check(char_length(filename) between 1 and 255),
 storage_path text not null unique, mime_type text not null check(mime_type in ('text/csv','application/vnd.ms-excel','text/plain','image/jpeg','image/png')),
 size_bytes integer not null check(size_bytes>0 and size_bytes<=10485760),
 processing_status text not null default 'uploaded' check(processing_status in ('uploaded','processing','processed','failed','stored_only')),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 check(storage_path like user_id::text || '/' || assessment_id::text || '/%')
);
grant select,delete on public.medical_uploads to authenticated;
grant insert(user_id,assessment_id,kind,filename,storage_path,mime_type,size_bytes) on public.medical_uploads to authenticated;
grant all on public.medical_uploads to service_role;
alter table public.medical_uploads enable row level security;
create policy uploads_own_read on public.medical_uploads for select to authenticated using(user_id=auth.uid());
create policy uploads_own_insert on public.medical_uploads for insert to authenticated with check(user_id=auth.uid() and exists(select 1 from public.assessments a where a.id=assessment_id and a.user_id=auth.uid()));
create policy uploads_own_delete on public.medical_uploads for delete to authenticated using(user_id=auth.uid() and processing_status<>'processing');
create index medical_uploads_assessment_idx on public.medical_uploads(assessment_id);
create index medical_uploads_user_idx on public.medical_uploads(user_id);
alter table public.assessments add constraint assessments_ecg_upload_fk foreign key(ecg_upload_id) references public.medical_uploads(id) on delete set null,
 add constraint assessments_echo_upload_fk foreign key(echo_upload_id) references public.medical_uploads(id) on delete set null;
create index assessments_ecg_upload_idx on public.assessments(ecg_upload_id);
create index assessments_echo_upload_idx on public.assessments(echo_upload_id);

create table public.patient_access_grants (
 id uuid primary key default gen_random_uuid(), patient_id uuid not null references public.profiles(id) on delete cascade,
 professional_id uuid not null references public.profiles(id) on delete cascade,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 unique(patient_id,professional_id), check(patient_id<>professional_id)
);
grant select,delete on public.patient_access_grants to authenticated;
grant all on public.patient_access_grants to service_role;
alter table public.patient_access_grants enable row level security;
create policy grants_patient_read on public.patient_access_grants for select to authenticated using(patient_id=auth.uid());
create policy grants_professional_read on public.patient_access_grants for select to authenticated using(professional_id=auth.uid());
create policy grants_patient_revoke on public.patient_access_grants for delete to authenticated using(patient_id=auth.uid());
create index patient_access_grants_prof_idx on public.patient_access_grants(professional_id);

create function public.has_role(_user_id uuid,_role public.app_role) returns boolean language sql stable security definer set search_path=public as $$
 select exists(select 1 from public.user_roles where user_id=_user_id and role=_role)
$$;
create function public.has_patient_access(_professional uuid,_patient uuid) returns boolean language sql stable security definer set search_path=public as $$
 select public.has_role(_professional,'medical_professional') and exists(select 1 from public.professional_requests where user_id=_professional and status='approved')
 and exists(select 1 from public.patient_access_grants where professional_id=_professional and patient_id=_patient)
$$;
create function public.has_patient_access_text(_professional uuid,_patient text) returns boolean language sql stable security definer set search_path=public as $$
 select exists(select 1 from public.patient_access_grants g where g.professional_id=_professional and g.patient_id::text=_patient and public.has_patient_access(_professional,g.patient_id))
$$;
create policy profiles_professional_read on public.profiles for select to authenticated using(public.has_patient_access(auth.uid(),id));
create policy profiles_admin_read on public.profiles for select to authenticated using(public.has_role(auth.uid(),'admin'));
create policy roles_admin_read on public.user_roles for select to authenticated using(public.has_role(auth.uid(),'admin'));
create policy requests_admin_read on public.professional_requests for select to authenticated using(public.has_role(auth.uid(),'admin'));
create policy health_professional_read on public.health_profiles for select to authenticated using(public.has_patient_access(auth.uid(),user_id));
create policy symptoms_professional_read on public.symptom_reports for select to authenticated using(public.has_patient_access(auth.uid(),user_id));
create policy assessments_professional_read on public.assessments for select to authenticated using(public.has_patient_access(auth.uid(),user_id));
create policy uploads_professional_read on public.medical_uploads for select to authenticated using(public.has_patient_access(auth.uid(),user_id));

create function public.touch_updated_at() returns trigger language plpgsql set search_path=public as $$ begin new.updated_at=now(); return new; end $$;
create trigger profiles_touch before update on public.profiles for each row execute function public.touch_updated_at();
create trigger requests_touch before update on public.professional_requests for each row execute function public.touch_updated_at();
create trigger health_profiles_touch before update on public.health_profiles for each row execute function public.touch_updated_at();
create trigger symptoms_touch before update on public.symptom_reports for each row execute function public.touch_updated_at();
create trigger assessments_touch before update on public.assessments for each row execute function public.touch_updated_at();
create trigger uploads_touch before update on public.medical_uploads for each row execute function public.touch_updated_at();
create trigger grants_touch before update on public.patient_access_grants for each row execute function public.touch_updated_at();

create function public.handle_new_user() returns trigger language plpgsql security definer set search_path=public as $$
 declare _type text:=case when new.raw_user_meta_data->>'account_type'='medical_professional' then 'medical_professional' else 'patient' end;
 begin
 insert into public.profiles(id,full_name,email,account_type) values(new.id,left(coalesce(new.raw_user_meta_data->>'full_name',''),200),new.email,_type);
 if _type='patient' then insert into public.user_roles(user_id,role) values(new.id,'patient');
 else insert into public.professional_requests(user_id,qualifications) values(new.id,left(coalesce(new.raw_user_meta_data->>'qualifications',''),2000)); end if;
 return new;
 end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

create function public.assessments_guard() returns trigger language plpgsql set search_path=public as $$
 begin
 if current_user in ('service_role','postgres','supabase_admin') then return new; end if;
 if new.ecg_status is distinct from old.ecg_status and new.ecg_status not in ('not_provided','pending') then raise exception 'ecg_status can only be set by the model service'; end if;
 if new.echo_status is distinct from old.echo_status and new.echo_status not in ('not_provided','pending') then raise exception 'echo_status can only be set by the model service'; end if;
 if new.ecg_upload_id is not null and not exists(select 1 from public.medical_uploads u where u.id=new.ecg_upload_id and u.assessment_id=new.id and u.user_id=new.user_id and u.kind in ('ecg_csv','ecg_image')) then raise exception 'invalid ECG upload reference'; end if;
 if new.echo_upload_id is not null and not exists(select 1 from public.medical_uploads u where u.id=new.echo_upload_id and u.assessment_id=new.id and u.user_id=new.user_id and u.kind='echo_image') then raise exception 'invalid ECHO upload reference'; end if;
 if old.ecg_status='processing' and (new.ecg_upload_id is distinct from old.ecg_upload_id or new.ecg_status is distinct from old.ecg_status) then raise exception 'Wait for ECG processing to finish'; end if;
 if old.echo_status='processing' and (new.echo_upload_id is distinct from old.echo_upload_id or new.echo_status is distinct from old.echo_status) then raise exception 'Wait for ECHO processing to finish'; end if;
 if new.ecg_upload_id is distinct from old.ecg_upload_id then new.ecg_result=null; new.ecg_model_version=null; new.ecg_error=null;
 new.ecg_status=case when exists(select 1 from public.medical_uploads where id=new.ecg_upload_id and kind='ecg_csv') then 'pending' else 'not_provided' end; end if;
 if new.echo_upload_id is distinct from old.echo_upload_id then new.echo_result=null; new.echo_model_version=null; new.echo_error=null; new.echo_status=case when new.echo_upload_id is null then 'not_provided' else 'pending' end; end if;
 return new;
 end $$;
create trigger assessments_guard before update on public.assessments for each row execute function public.assessments_guard();

create function public.grant_professional_access(_email text) returns uuid language plpgsql security definer set search_path=public as $$
 declare _pro uuid; _id uuid;
 begin
 if auth.uid() is null or not public.has_role(auth.uid(),'patient') then raise exception 'Patient privileges required'; end if;
 select p.id into _pro from public.profiles p where lower(p.email)=lower(trim(_email)) and public.has_role(p.id,'medical_professional') and exists(select 1 from public.professional_requests r where r.user_id=p.id and r.status='approved');
 if _pro is null then raise exception 'No approved medical professional found with that email'; end if;
 if _pro=auth.uid() then raise exception 'You cannot grant access to yourself'; end if;
 insert into public.patient_access_grants(patient_id,professional_id) values(auth.uid(),_pro) on conflict(patient_id,professional_id) do update set created_at=excluded.created_at returning id into _id;
 return _id;
 end $$;
create function public.my_granted_patients() returns table(patient_id uuid,full_name text,email text,granted_at timestamptz) language sql stable security definer set search_path=public as $$
 select g.patient_id,p.full_name,p.email,g.created_at from public.patient_access_grants g join public.profiles p on p.id=g.patient_id where g.professional_id=auth.uid() and public.has_patient_access(auth.uid(),g.patient_id) order by g.created_at desc
$$;
create function public.my_access_grants() returns table(grant_id uuid,professional_id uuid,full_name text,email text,granted_at timestamptz) language sql stable security definer set search_path=public as $$
 select g.id,g.professional_id,p.full_name,p.email,g.created_at from public.patient_access_grants g join public.profiles p on p.id=g.professional_id where g.patient_id=auth.uid() order by g.created_at desc
$$;
create function public.review_professional_request(_request_id uuid,_approve boolean,_note text default null) returns void language plpgsql security definer set search_path=public as $$
 declare _uid uuid;
 begin
 if not public.has_role(auth.uid(),'admin') then raise exception 'admin privileges required'; end if;
 update public.professional_requests set status=case when _approve then 'approved' else 'rejected' end,review_note=left(_note,1000),reviewed_by=auth.uid(),reviewed_at=now() where id=_request_id returning user_id into _uid;
 if _uid is null then raise exception 'request not found'; end if;
 if _approve then insert into public.user_roles(user_id,role,granted_by) values(_uid,'medical_professional',auth.uid()) on conflict(user_id,role) do nothing;
 else delete from public.user_roles where user_id=_uid and role='medical_professional'; end if;
 end $$;
create function public.admin_revoke_professional(_user_id uuid) returns void language plpgsql security definer set search_path=public as $$
 begin
 if not public.has_role(auth.uid(),'admin') then raise exception 'admin privileges required'; end if;
 delete from public.user_roles where user_id=_user_id and role='medical_professional';
 update public.professional_requests set status='rejected',reviewed_by=auth.uid(),reviewed_at=now(),review_note=coalesce(review_note,'Access revoked by administrator') where user_id=_user_id;
 end $$;
create function public.admin_stats() returns json language plpgsql stable security definer set search_path=public as $$
 begin
 if not public.has_role(auth.uid(),'admin') then raise exception 'admin privileges required'; end if;
 return json_build_object('users',(select count(*) from public.profiles),'patients',(select count(*) from public.profiles where account_type='patient'),'approved_professionals',(select count(*) from public.user_roles where role='medical_professional'),'pending_requests',(select count(*) from public.professional_requests where status='pending'),'assessments',(select count(*) from public.assessments),'completed_assessments',(select count(*) from public.assessments where status='completed'),'uploads',(select count(*) from public.medical_uploads));
 end $$;

revoke all on function public.grant_professional_access(text),public.my_granted_patients(),public.my_access_grants(),public.review_professional_request(uuid,boolean,text),public.admin_revoke_professional(uuid),public.admin_stats(),public.handle_new_user(),public.has_role(uuid,public.app_role),public.has_patient_access(uuid,uuid),public.has_patient_access_text(uuid,text),public.touch_updated_at(),public.assessments_guard() from public,anon;
grant execute on function public.grant_professional_access(text),public.my_granted_patients(),public.my_access_grants(),public.review_professional_request(uuid,boolean,text),public.admin_revoke_professional(uuid),public.admin_stats(),public.has_role(uuid,public.app_role),public.has_patient_access(uuid,uuid),public.has_patient_access_text(uuid,text) to authenticated;
grant execute on function public.has_role(uuid,public.app_role),public.has_patient_access(uuid,uuid),public.has_patient_access_text(uuid,text) to service_role;

create policy medical_uploads_storage_insert on storage.objects for insert to authenticated with check(bucket_id='medical-uploads' and (storage.foldername(name))[1]=auth.uid()::text and exists(select 1 from public.assessments a where a.id::text=(storage.foldername(name))[2] and a.user_id=auth.uid()));
create policy medical_uploads_storage_read on storage.objects for select to authenticated using(bucket_id='medical-uploads' and ((storage.foldername(name))[1]=auth.uid()::text or exists(select 1 from public.medical_uploads u where u.storage_path=name and public.has_patient_access(auth.uid(),u.user_id))));
create policy medical_uploads_storage_delete on storage.objects for delete to authenticated using(bucket_id='medical-uploads' and (storage.foldername(name))[1]=auth.uid()::text and not exists(select 1 from public.medical_uploads u where u.storage_path=name and u.processing_status='processing'));
