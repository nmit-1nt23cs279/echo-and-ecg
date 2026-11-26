export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      assessments: {
        Row: {
          completed_at: string | null
          created_at: string
          current_step: number
          ecg_error: string | null
          ecg_model_version: string | null
          ecg_result: Json | null
          ecg_status: string
          ecg_upload_id: string | null
          echo_error: string | null
          echo_model_version: string | null
          echo_result: Json | null
          echo_status: string
          echo_upload_id: string | null
          fusion_status: string
          id: string
          status: string
          symptom_report_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          current_step?: number
          ecg_error?: string | null
          ecg_model_version?: string | null
          ecg_result?: Json | null
          ecg_status?: string
          ecg_upload_id?: string | null
          echo_error?: string | null
          echo_model_version?: string | null
          echo_result?: Json | null
          echo_status?: string
          echo_upload_id?: string | null
          fusion_status?: string
          id?: string
          status?: string
          symptom_report_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          current_step?: number
          ecg_error?: string | null
          ecg_model_version?: string | null
          ecg_result?: Json | null
          ecg_status?: string
          ecg_upload_id?: string | null
          echo_error?: string | null
          echo_model_version?: string | null
          echo_result?: Json | null
          echo_status?: string
          echo_upload_id?: string | null
          fusion_status?: string
          id?: string
          status?: string
          symptom_report_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "assessments_ecg_upload_fk"
            columns: ["ecg_upload_id"]
            isOneToOne: false
            referencedRelation: "medical_uploads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessments_echo_upload_fk"
            columns: ["echo_upload_id"]
            isOneToOne: false
            referencedRelation: "medical_uploads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessments_symptom_report_id_fkey"
            columns: ["symptom_report_id"]
            isOneToOne: false
            referencedRelation: "symptom_reports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      browser_predictions: {
        Row: {
          assessment_id: string
          created_at: string
          error: string | null
          id: string
          kind: string
          model_version: string
          result: Json | null
          status: string
          updated_at: string
          upload_id: string
          user_id: string
        }
        Insert: {
          assessment_id: string
          created_at?: string
          error?: string | null
          id?: string
          kind: string
          model_version?: string
          result?: Json | null
          status: string
          updated_at?: string
          upload_id: string
          user_id: string
        }
        Update: {
          assessment_id?: string
          created_at?: string
          error?: string | null
          id?: string
          kind?: string
          model_version?: string
          result?: Json | null
          status?: string
          updated_at?: string
          upload_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "browser_predictions_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "assessments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "browser_predictions_upload_id_fkey"
            columns: ["upload_id"]
            isOneToOne: false
            referencedRelation: "medical_uploads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "browser_predictions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      health_profiles: {
        Row: {
          allergies: string | null
          cardiovascular_history: string | null
          created_at: string
          diabetes: boolean | null
          family_history: string | null
          hypertension: boolean | null
          medical_history: string | null
          medications: string | null
          smoking_status: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          allergies?: string | null
          cardiovascular_history?: string | null
          created_at?: string
          diabetes?: boolean | null
          family_history?: string | null
          hypertension?: boolean | null
          medical_history?: string | null
          medications?: string | null
          smoking_status?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          allergies?: string | null
          cardiovascular_history?: string | null
          created_at?: string
          diabetes?: boolean | null
          family_history?: string | null
          hypertension?: boolean | null
          medical_history?: string | null
          medications?: string | null
          smoking_status?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "health_profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      medical_uploads: {
        Row: {
          assessment_id: string
          created_at: string
          filename: string
          id: string
          kind: string
          mime_type: string
          processing_status: string
          size_bytes: number
          storage_path: string
          updated_at: string
          user_id: string
        }
        Insert: {
          assessment_id: string
          created_at?: string
          filename: string
          id?: string
          kind: string
          mime_type: string
          processing_status?: string
          size_bytes: number
          storage_path: string
          updated_at?: string
          user_id: string
        }
        Update: {
          assessment_id?: string
          created_at?: string
          filename?: string
          id?: string
          kind?: string
          mime_type?: string
          processing_status?: string
          size_bytes?: number
          storage_path?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "medical_uploads_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "assessments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "medical_uploads_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      patient_access_grants: {
        Row: {
          created_at: string
          id: string
          patient_id: string
          professional_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          patient_id: string
          professional_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          patient_id?: string
          professional_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "patient_access_grants_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_access_grants_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      professional_requests: {
        Row: {
          created_at: string
          id: string
          institution: string | null
          qualifications: string
          registration_number: string | null
          review_note: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          institution?: string | null
          qualifications?: string
          registration_number?: string | null
          review_note?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          institution?: string | null
          qualifications?: string
          registration_number?: string | null
          review_note?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "professional_requests_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "professional_requests_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      professional_reviews: {
        Row: {
          assessment_id: string
          clinical_observations: string
          completed_at: string | null
          created_at: string
          ecg_interpretation: string
          echo_interpretation: string
          follow_up: string
          further_investigations: string
          id: string
          medication_recommendations: string
          notes: string
          overall_assessment: string
          professional_id: string
          professional_name: string
          recommendations: string
          status: string
          updated_at: string
        }
        Insert: {
          assessment_id: string
          clinical_observations?: string
          completed_at?: string | null
          created_at?: string
          ecg_interpretation?: string
          echo_interpretation?: string
          follow_up?: string
          further_investigations?: string
          id?: string
          medication_recommendations?: string
          notes?: string
          overall_assessment?: string
          professional_id: string
          professional_name?: string
          recommendations?: string
          status?: string
          updated_at?: string
        }
        Update: {
          assessment_id?: string
          clinical_observations?: string
          completed_at?: string | null
          created_at?: string
          ecg_interpretation?: string
          echo_interpretation?: string
          follow_up?: string
          further_investigations?: string
          id?: string
          medication_recommendations?: string
          notes?: string
          overall_assessment?: string
          professional_id?: string
          professional_name?: string
          recommendations?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "professional_reviews_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "assessments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "professional_reviews_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          account_type: string
          blood_group: string | null
          created_at: string
          date_of_birth: string | null
          email: string
          full_name: string
          height_cm: number | null
          id: string
          sex: string | null
          updated_at: string
          weight_kg: number | null
        }
        Insert: {
          account_type?: string
          blood_group?: string | null
          created_at?: string
          date_of_birth?: string | null
          email: string
          full_name?: string
          height_cm?: number | null
          id: string
          sex?: string | null
          updated_at?: string
          weight_kg?: number | null
        }
        Update: {
          account_type?: string
          blood_group?: string | null
          created_at?: string
          date_of_birth?: string | null
          email?: string
          full_name?: string
          height_cm?: number | null
          id?: string
          sex?: string | null
          updated_at?: string
          weight_kg?: number | null
        }
        Relationships: []
      }
      symptom_reports: {
        Row: {
          created_at: string
          duration: string | null
          id: string
          notes: string | null
          onset: string | null
          severity: number | null
          symptoms: string[]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          duration?: string | null
          id?: string
          notes?: string | null
          onset?: string | null
          severity?: number | null
          symptoms?: string[]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          duration?: string | null
          id?: string
          notes?: string | null
          onset?: string | null
          severity?: number | null
          symptoms?: string[]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "symptom_reports_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          granted_at: string
          granted_by: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          granted_at?: string
          granted_by?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          granted_at?: string
          granted_by?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_granted_by_fkey"
            columns: ["granted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_revoke_professional: {
        Args: { _user_id: string }
        Returns: undefined
      }
      admin_stats: { Args: never; Returns: Json }
      grant_professional_access: { Args: { _email: string }; Returns: string }
      has_patient_access: {
        Args: { _patient: string; _professional: string }
        Returns: boolean
      }
      has_patient_access_text: {
        Args: { _patient: string; _professional: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      my_access_grants: {
        Args: never
        Returns: {
          email: string
          full_name: string
          grant_id: string
          granted_at: string
          professional_id: string
        }[]
      }
      my_granted_patients: {
        Args: never
        Returns: {
          email: string
          full_name: string
          granted_at: string
          patient_id: string
        }[]
      }
      review_professional_request: {
        Args: { _approve: boolean; _note?: string; _request_id: string }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "patient" | "medical_professional" | "admin"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["patient", "medical_professional", "admin"],
    },
  },
} as const
