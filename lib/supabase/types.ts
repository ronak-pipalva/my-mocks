export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      exams: {
        Row: {
          id: string;
          name: string;
          is_bilingual: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          is_bilingual?: boolean;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["exams"]["Insert"]>;
      };
      sections: {
        Row: {
          id: string;
          exam_id: string;
          name: string;
          display_order: number;
        };
        Insert: {
          id?: string;
          exam_id: string;
          name: string;
          display_order: number;
        };
        Update: Partial<Database["public"]["Tables"]["sections"]["Insert"]>;
      };
      mocks: {
        Row: {
          id: string;
          exam_id: string;
          title: string;
          slug: string;
          negative_marking: number;
          max_attempts: number | null;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          exam_id: string;
          title: string;
          slug: string;
          negative_marking?: number;
          max_attempts?: number | null;
          is_active?: boolean;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["mocks"]["Insert"]>;
      };
      mock_section_config: {
        Row: {
          id: string;
          mock_id: string;
          section_id: string;
          duration_minutes: number;
          marks_per_question: number;
          display_order: number;
        };
        Insert: {
          id?: string;
          mock_id: string;
          section_id: string;
          duration_minutes: number;
          marks_per_question: number;
          display_order: number;
        };
        Update: Partial<
          Database["public"]["Tables"]["mock_section_config"]["Insert"]
        >;
      };
      questions: {
        Row: {
          id: string;
          mock_id: string;
          section_id: string;
          question_number: number;
          question_text_en: string;
          question_text_hi: string | null;
          option_a_en: string;
          option_a_hi: string | null;
          option_b_en: string;
          option_b_hi: string | null;
          option_c_en: string;
          option_c_hi: string | null;
          option_d_en: string;
          option_d_hi: string | null;
          correct_option: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          mock_id: string;
          section_id: string;
          question_number: number;
          question_text_en: string;
          question_text_hi?: string | null;
          option_a_en: string;
          option_a_hi?: string | null;
          option_b_en: string;
          option_b_hi?: string | null;
          option_c_en: string;
          option_c_hi?: string | null;
          option_d_en: string;
          option_d_hi?: string | null;
          correct_option: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["questions"]["Insert"]>;
      };
      attempts: {
        Row: {
          id: string;
          mock_id: string;
          attempt_number: number;
          started_at: string;
          submitted_at: string | null;
          ended_reason: string | null;
          total_score: number | null;
          correct_count: number | null;
          wrong_count: number | null;
          unattempted_count: number | null;
        };
        Insert: {
          id?: string;
          mock_id: string;
          attempt_number: number;
          started_at?: string;
          submitted_at?: string | null;
          ended_reason?: string | null;
          total_score?: number | null;
          correct_count?: number | null;
          wrong_count?: number | null;
          unattempted_count?: number | null;
        };
        Update: Partial<Database["public"]["Tables"]["attempts"]["Insert"]>;
      };
      attempt_answers: {
        Row: {
          id: string;
          attempt_id: string;
          question_id: string;
          selected_option: string | null;
          is_correct: boolean | null;
          time_spent_seconds: number | null;
        };
        Insert: {
          id?: string;
          attempt_id: string;
          question_id: string;
          selected_option?: string | null;
          is_correct?: boolean | null;
          time_spent_seconds?: number | null;
        };
        Update: Partial<
          Database["public"]["Tables"]["attempt_answers"]["Insert"]
        >;
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
}
