export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: { id: string; timezone: string; created_at: string; updated_at: string };
        Insert: { id: string; timezone?: string; created_at?: string; updated_at?: string };
        Update: { timezone?: string; updated_at?: string };
        Relationships: [
          {
            foreignKeyName: "day_entries_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      day_entries: {
        Row: {
          id: string; user_id: string; date: string; bladder_pain_morning: number | null;
          bladder_pain_evening: number | null; perceived_stress: number | null;
          external_stress: number | null; sleep_hours: number | null;
          hydration_ml: number | null; notes: string | null; created_at: string; updated_at: string;
        };
        Insert: {
          id?: string; user_id: string; date: string; bladder_pain_morning?: number | null;
          bladder_pain_evening?: number | null; perceived_stress?: number | null;
          external_stress?: number | null; sleep_hours?: number | null;
          hydration_ml?: number | null; notes?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["day_entries"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "foods_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      foods: {
        Row: { id: string; user_id: string; name: string; created_at: string };
        Insert: { id?: string; user_id: string; name: string; created_at?: string };
        Update: { name?: string };
        Relationships: [
          {
            foreignKeyName: "food_consumptions_day_entry_id_fkey";
            columns: ["day_entry_id"];
            isOneToOne: false;
            referencedRelation: "day_entries";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "food_consumptions_food_id_fkey";
            columns: ["food_id"];
            isOneToOne: false;
            referencedRelation: "foods";
            referencedColumns: ["id"];
          }
        ];
      };
      food_consumptions: {
        Row: { id: string; day_entry_id: string; food_id: string; meal_period: Database["public"]["Enums"]["meal_period"]; created_at: string };
        Insert: { id?: string; day_entry_id: string; food_id: string; meal_period: Database["public"]["Enums"]["meal_period"] };
        Update: { meal_period?: Database["public"]["Enums"]["meal_period"] };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      save_day_entry: {
        Args: {
          p_date: string; p_bladder_pain_morning: number | null; p_bladder_pain_evening: number | null;
          p_perceived_stress: number | null; p_external_stress: number | null; p_sleep_hours: number | null;
          p_hydration_ml: number | null; p_notes: string | null; p_consumptions: Json;
        };
        Returns: string;
      };
    };
    Enums: {
      meal_period: "morning" | "lunch" | "evening";
    };
    CompositeTypes: Record<string, never>;
  };
}
