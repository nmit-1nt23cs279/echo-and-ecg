import { MEDICAL_BUCKET, supabase, SUPABASE_PUBLIC } from "./supabase";
import { contentTypeFor, safeFilename, type UploadKind } from "./validation";
import type { MedicalUpload } from "./types";

/** Uploads to the private bucket with real byte progress, then records the upload row. */
export async function uploadMedicalFile(opts: {
  file: File;
  kind: UploadKind;
  userId: string;
  assessmentId: string;
  onProgress: (pct: number) => void;
}): Promise<MedicalUpload> {
  const { file, kind, userId, assessmentId, onProgress } = opts;
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("Your session expired. Please sign in again.");

  const path = `${userId}/${assessmentId}/${Date.now()}-${safeFilename(file.name)}`;
  const url = `${SUPABASE_PUBLIC.url}/storage/v1/object/${MEDICAL_BUCKET}/${path.split("/").map(encodeURIComponent).join("/")}`;
  const contentType = contentTypeFor(file, kind);

  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", url);
    xhr.setRequestHeader("authorization", `Bearer ${token}`);
    xhr.setRequestHeader("apikey", SUPABASE_PUBLIC.key);
    xhr.setRequestHeader("content-type", contentType);
    xhr.setRequestHeader("x-upsert", "false");
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress(Math.round((e.loaded / e.total) * 100));
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve();
      else {
        let msg = `Upload failed (${xhr.status})`;
        try {
          msg = JSON.parse(xhr.responseText).message || msg;
        } catch {
          /* ignore */
        }
        reject(new Error(msg));
      }
    };
    xhr.onerror = () => reject(new Error("Network error during upload."));
    xhr.send(file);
  });

  const { data: row, error } = await supabase
    .from("medical_uploads")
    .insert({
      user_id: userId,
      assessment_id: assessmentId,
      kind,
      filename: file.name.slice(0, 255),
      storage_path: path,
      mime_type: contentType,
      size_bytes: file.size,
    })
    .select()
    .single();
  if (error) {
    await supabase.storage.from(MEDICAL_BUCKET).remove([path]);
    throw new Error(error.message);
  }
  return row as MedicalUpload;
}

export async function signedUrl(path: string) {
  const { data, error } = await supabase.storage.from(MEDICAL_BUCKET).createSignedUrl(path, 300);
  if (error) throw new Error(error.message);
  return data.signedUrl;
}
