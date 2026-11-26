// Run against an EMPTY disposable local PostgreSQL database only:
// CARDIOFUSION_TEST_DATABASE_URL=postgresql://postgres@127.0.0.1:55432/postgres bunx vitest run src/test/backend-permissions.test.ts
// Never point this suite at Supabase or any database containing real data.
import { execFileSync } from "node:child_process";
import { readFileSync, readdirSync } from "node:fs";
import { describe, expect, it, beforeAll } from "vitest";

const url = process.env['CARDIOFUSION_TEST_DATABASE_URL'];
const patient = "00000000-0000-0000-0000-000000000001";
const other = "00000000-0000-0000-0000-000000000002";
const professional = "00000000-0000-0000-0000-000000000003";
const admin = "00000000-0000-0000-0000-000000000004";
const assessment = "10000000-0000-0000-0000-000000000001";

function sql(query: string) {
  if (!url || !/^postgresql:\/\/postgres@127\.0\.0\.1:55432\/postgres$/.test(url)) {
    throw new Error("Only the disposable localhost permission-test database is allowed.");
  }
  return execFileSync("psql", [url, "-X", "-qAt", "-v", "ON_ERROR_STOP=1"], { input: query, encoding: "utf8", stdio: ["pipe", "pipe", "pipe"] }).trim();
}
const asUser = (id: string, query: string) => sql(`begin; set local role authenticated; select set_config('request.jwt.claim.sub','${id}',true); ${query}; rollback;`).split("\n").slice(1).join("\n");

describe.skipIf(!url)("Applied CardioFusion SQL permissions", () => {
  beforeAll(() => {
    if (sql("select count(*) from pg_tables where schemaname in ('public','auth','storage')") !== "0") {
      throw new Error("Test database must be empty; refusing to change it.");
    }
    sql(`create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;
      create schema auth; create schema storage;
      create table auth.users(id uuid primary key,email text,raw_user_meta_data jsonb);
      create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
      grant usage on schema auth,storage,public to anon,authenticated,service_role;
      grant execute on function auth.uid() to authenticated;
      create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text,name text);
      grant select,insert,delete on storage.objects to authenticated; alter table storage.objects enable row level security;
      create function storage.foldername(text) returns text[] language sql immutable as $$ select (string_to_array($1,'/'))[1:array_length(string_to_array($1,'/'),1)-1] $$;`);
    for (const file of readdirSync("supabase/migrations").filter((f) => f.endsWith(".sql")).sort()) {
      sql(readFileSync(`supabase/migrations/${file}`, "utf8"));
    }
    sql(`insert into auth.users values
      ('${patient}','patient@example.test','{"full_name":"Test Patient","account_type":"patient"}'),
      ('${other}','other@example.test','{"account_type":"patient"}'),
      ('${professional}','professional@example.test','{"full_name":"Test Professional","account_type":"medical_professional","qualifications":"Test qualification"}'),
      ('${admin}','admin@example.test','{"account_type":"patient"}');
      insert into public.user_roles(user_id,role) values('${admin}','admin');
      insert into public.assessments(id,user_id) values('${assessment}','${patient}');`);
  });

  it("creates a signup profile and patient role without granting admin", () => {
    expect(asUser(patient, "select full_name from public.profiles; select role from public.user_roles")).toBe("Test Patient\npatient");
  });
  it("patients cannot read or edit another patient's assessment", () => {
    expect(asUser(other, `select count(*) from public.assessments; with changed as (update public.assessments set current_step=2 where id='${assessment}' returning id) select count(*) from changed`)).toBe("0\n0");
  });
  it("patients can create and read back their own assessment", () => {
    expect(asUser(other, `insert into public.assessments(user_id) values('${other}'); select count(*) from public.assessments`)).toBe("1");
  });
  it("professional signup grants the professional role without administrator privileges", () => {
    expect(asUser(professional, "select role from public.user_roles where user_id=auth.uid()")).toBe("medical_professional");
    expect(asUser(professional, "select public.has_role(auth.uid(),'admin')")).toBe("f");
  });
  it("professionals require patient authorization but not administrator approval", () => {
    expect(asUser(professional, "select count(*) from public.assessments")).toBe("0");
    const result = sql(`begin; set local role authenticated;
      select set_config('request.jwt.claim.sub','${professional}',true); select count(*) from public.assessments;
      select set_config('request.jwt.claim.sub','${patient}',true); select public.grant_professional_access('professional@example.test') is not null;
      select set_config('request.jwt.claim.sub','${professional}',true); select count(*) from public.assessments;
      select set_config('request.jwt.claim.sub','${patient}',true); delete from public.patient_access_grants;
      select set_config('request.jwt.claim.sub','${professional}',true); select count(*) from public.assessments; rollback;`);
    expect(result.split("\n").filter((s) => ["0", "1", "t"].includes(s))).toEqual(["0", "t", "1", "0"]);
  });
  it("patients cannot self-assign administrator privileges", () => {
    expect(() => asUser(patient, `insert into public.user_roles(user_id,role) values('${patient}','admin')`)).toThrow();
    expect(() => asUser(patient, "select public.admin_stats()")).toThrow();
  });
  it("professionals cannot approve requests or invoke admin functions", () => {
    expect(() => asUser(professional, "update public.professional_requests set status='approved'")).toThrow();
    expect(() => asUser(professional, "select public.review_professional_request((select id from public.professional_requests),true)")).toThrow();
    expect(() => asUser(professional, "select public.admin_stats()")).toThrow();
    expect(() => asUser(professional, `insert into public.user_roles(user_id,role) values('${professional}','admin')`)).toThrow();
  });
  it("signup ignores administrator role claims and unrecognized account types", () => {
    const id = "00000000-0000-0000-0000-000000000005";
    expect(sql(`begin; insert into auth.users values('${id}','metadata@example.test','{"account_type":"admin","role":"admin","is_admin":true}'); select role from public.user_roles where user_id='${id}'; rollback;`)).toBe("patient");
  });
  it("professionals cannot see ungranted patient profiles, symptoms, health or uploads", () => {
    expect(asUser(professional, `select count(*) from public.profiles where id='${patient}'; select count(*) from public.health_profiles where user_id='${patient}'; select count(*) from public.symptom_reports where user_id='${patient}'; select count(*) from public.medical_uploads where user_id='${patient}'`)).toBe("0\n0\n0\n0");
  });
  it("allows own professional detail updates without unlocking review fields", () => {
    expect(asUser(professional, "update public.professional_requests set qualifications='Updated qualification' where user_id=auth.uid(); select qualifications from public.professional_requests where user_id=auth.uid()")).toBe("Updated qualification");
    expect(() => asUser(professional, "update public.professional_requests set reviewed_by=auth.uid() where user_id=auth.uid()")).toThrow();
  });
  it("browser users cannot fabricate model predictions", () => {
    expect(() => asUser(patient, `update public.assessments set ecg_result='{"output":1}' where id='${assessment}'`)).toThrow();
    expect(() => asUser(patient, `update public.assessments set ecg_status='completed' where id='${assessment}'`)).toThrow();
  });
  it("storage requires the uploader's own assessment folder", () => {
    expect(asUser(patient, `insert into storage.objects(bucket_id,name) values('medical-uploads','${patient}/${assessment}/ecg.csv'); select count(*) from storage.objects`)).toBe("1");
    expect(() => asUser(other, `insert into storage.objects(bucket_id,name) values('medical-uploads','${other}/${assessment}/ecg.csv')`)).toThrow();
    expect(() => asUser(other, `insert into storage.objects(bucket_id,name) values('medical-uploads','${patient}/${assessment}/ecg.csv')`)).toThrow();
  });
  it("anonymous callers have no application table access", () => {
    expect(() => sql("begin; set local role anon; select * from public.assessments; rollback;")).toThrow();
  });

  const upload = "20000000-0000-0000-0000-000000000001";
  const validEcg = '{"output":0.7321,"predicted_index":1,"label":null,"label_mapping_verified":false,"threshold":0.5}';
  it("owners can save and read their own browser predictions for matching uploads", () => {
    sql(`insert into public.medical_uploads(id,assessment_id,user_id,kind,filename,storage_path,mime_type,size_bytes) values('${upload}','${assessment}','${patient}','ecg_csv','ecg.csv','${patient}/${assessment}/ecg.csv','text/csv',100)`);
    expect(asUser(patient, `insert into public.browser_predictions(assessment_id,upload_id,user_id,kind,status,result) values('${assessment}','${upload}','${patient}','ecg','completed','${validEcg}'); select status from public.browser_predictions where assessment_id='${assessment}'`)).toBe("completed");
    // Committed copy for the cross-account visibility tests below.
    sql(`insert into public.browser_predictions(assessment_id,upload_id,user_id,kind,status,result) values('${assessment}','${upload}','${patient}','ecg','completed','${validEcg}')`);
  });
  it("rejects malformed or mismatched browser predictions", () => {
    expect(() => asUser(patient, `insert into public.browser_predictions(assessment_id,upload_id,user_id,kind,status,result) values('${assessment}','${upload}','${patient}','ecg','completed','{"output":1.5,"predicted_index":1,"threshold":0.5}')`)).toThrow();
    expect(() => asUser(patient, `insert into public.browser_predictions(assessment_id,upload_id,user_id,kind,status,result) values('${assessment}','${upload}','${patient}','echo','completed','{"probabilities":[{"probability":0.1}],"predicted_index":0}')`)).toThrow();
    expect(() => asUser(patient, `insert into public.browser_predictions(assessment_id,upload_id,user_id,kind,status) values('${assessment}','${upload}','${patient}','ecg','failed')`)).toThrow();
    expect(() => asUser(other, `insert into public.browser_predictions(assessment_id,upload_id,user_id,kind,status,result) values('${assessment}','${upload}','${patient}','ecg','completed','${validEcg}')`)).toThrow();
  });
  it("browser predictions are visible to granted professionals only", () => {
    expect(asUser(professional, `select count(*) from public.browser_predictions where assessment_id='${assessment}'`)).toBe("0");
    const result = sql(`begin; set local role authenticated;
      select set_config('request.jwt.claim.sub','${patient}',true); select public.grant_professional_access('professional@example.test') is not null;
      select set_config('request.jwt.claim.sub','${professional}',true); select count(*) from public.browser_predictions where assessment_id='${assessment}';
      select set_config('request.jwt.claim.sub','${patient}',true); delete from public.patient_access_grants;
      select set_config('request.jwt.claim.sub','${professional}',true); select count(*) from public.browser_predictions where assessment_id='${assessment}'; rollback;`);
    expect(result.split("\n").filter((s) => ["0", "1", "t"].includes(s))).toEqual(["t", "1", "0"]);
  });
  it("only authorised professionals can create reviews, and only their own", () => {
    expect(() => asUser(professional, `insert into public.professional_reviews(assessment_id,overall_assessment) values('${assessment}','No acute abnormality identified')`)).toThrow();
    expect(() => asUser(patient, `insert into public.professional_reviews(assessment_id,overall_assessment) values('${assessment}','x')`)).toThrow();
    const result = sql(`begin; set local role authenticated;
      select set_config('request.jwt.claim.sub','${patient}',true); select public.grant_professional_access('professional@example.test') is not null;
      select set_config('request.jwt.claim.sub','${professional}',true);
      insert into public.professional_reviews(assessment_id,overall_assessment,status) values('${assessment}','No acute abnormality identified','completed');
      select professional_id, professional_name, status, completed_at is not null from public.professional_reviews where assessment_id='${assessment}';
      select set_config('request.jwt.claim.sub','${patient}',true); select count(*) from public.professional_reviews where assessment_id='${assessment}'; rollback;`);
    const lines = result.split("\n").filter((s) => s === "t" || s.includes("|") || s === "1");
    expect(lines).toEqual(["t", `${professional}|Test Professional|completed|t`, "1"]);
  });
  it("a different professional cannot modify another professional's review, and the review target is immutable", () => {
    const second = "00000000-0000-0000-0000-000000000006";
    sql(`insert into auth.users values('${second}','second@example.test','{"full_name":"Second Professional","account_type":"medical_professional"}')`);
    const result = sql(`begin; set local role authenticated;
      select set_config('request.jwt.claim.sub','${patient}',true);
      select public.grant_professional_access('professional@example.test') is not null;
      select public.grant_professional_access('second@example.test') is not null;
      select set_config('request.jwt.claim.sub','${professional}',true);
      insert into public.professional_reviews(assessment_id,overall_assessment,status) values('${assessment}','Assessment complete','completed');
      select set_config('request.jwt.claim.sub','${second}',true);
      with changed as (update public.professional_reviews set notes='tampered' returning id) select count(*) from changed;
      select count(*) from public.professional_reviews where assessment_id='${assessment}'; rollback;`);
    expect(result.split("\n").filter((s) => ["0", "1", "t"].includes(s))).toEqual(["t", "t", "0", "1"]);
    expect(() => sql(`begin; set local role authenticated;
      select set_config('request.jwt.claim.sub','${patient}',true); select public.grant_professional_access('professional@example.test');
      select set_config('request.jwt.claim.sub','${professional}',true);
      insert into public.professional_reviews(assessment_id,overall_assessment) values('${assessment}','x');
      update public.professional_reviews set assessment_id='10000000-0000-0000-0000-000000000099'; rollback;`)).toThrow();
  });
});