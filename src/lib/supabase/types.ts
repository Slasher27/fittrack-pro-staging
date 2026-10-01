
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "graphql_public": {
          Tables: {
            [_ in never]: never
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "graphql":
{ Args: { "extensions"?: Json,"operationName"?: string,"query"?: string,"variables"?: Json }; Returns: Json
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        },"public": {
          Tables: {
            "ai_usage": {
                  Row: {
                    "at": string,"cost_cents": number,"id": string,"input_tokens": number,"kind": string,"model": string,"output_tokens": number,"user_id": string
                  }
                  Insert: {
                    "at"?: string,"cost_cents"?: number,"id"?: string,"input_tokens"?: number,"kind": string,"model": string,"output_tokens"?: number,"user_id": string
                  }
                  Update: {
                    "at"?: string,"cost_cents"?: number,"id"?: string,"input_tokens"?: number,"kind"?: string,"model"?: string,"output_tokens"?: number,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "ai_usage_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"body_metrics": {
                  Row: {
                    "arm_cm": number | null,"chest_cm": number | null,"date": string,"deleted": boolean,"id": string,"notes": string | null,"steps": number | null,"synced_at": string,"thigh_cm": number | null,"up": number,"user_id": string,"waist_cm": number | null,"weight_kg": number | null
                  }
                  Insert: {
                    "arm_cm"?: number | null,"chest_cm"?: number | null,"date": string,"deleted"?: boolean,"id": string,"notes"?: string | null,"steps"?: number | null,"synced_at"?: string,"thigh_cm"?: number | null,"up"?: number,"user_id": string,"waist_cm"?: number | null,"weight_kg"?: number | null
                  }
                  Update: {
                    "arm_cm"?: number | null,"chest_cm"?: number | null,"date"?: string,"deleted"?: boolean,"id"?: string,"notes"?: string | null,"steps"?: number | null,"synced_at"?: string,"thigh_cm"?: number | null,"up"?: number,"user_id"?: string,"waist_cm"?: number | null,"weight_kg"?: number | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "body_metrics_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"equipment_catalog": {
                  Row: {
                    "capabilities": (string)[],"category": string,"id": string,"name": string,"weight_kind": string
                  }
                  Insert: {
                    "capabilities": (string)[],"category": string,"id": string,"name": string,"weight_kind": string
                  }
                  Update: {
                    "capabilities"?: (string)[],"category"?: string,"id"?: string,"name"?: string,"weight_kind"?: string
                  }
                  Relationships: [
                    
                  ]
                },"food_logs": {
                  Row: {
                    "carbs_g": number,"deleted": boolean,"eaten_at": string,"estimated": boolean,"fat_g": number,"food_id": string | null,"grams": number | null,"id": string,"kcal": number,"meal_slot": string | null,"name": string,"protein_g": number,"serving_label": string | null,"servings": number | null,"synced_at": string,"up": number,"user_id": string
                  }
                  Insert: {
                    "carbs_g"?: number,"deleted"?: boolean,"eaten_at": string,"estimated"?: boolean,"fat_g"?: number,"food_id"?: string | null,"grams"?: number | null,"id": string,"kcal"?: number,"meal_slot"?: string | null,"name": string,"protein_g"?: number,"serving_label"?: string | null,"servings"?: number | null,"synced_at"?: string,"up"?: number,"user_id": string
                  }
                  Update: {
                    "carbs_g"?: number,"deleted"?: boolean,"eaten_at"?: string,"estimated"?: boolean,"fat_g"?: number,"food_id"?: string | null,"grams"?: number | null,"id"?: string,"kcal"?: number,"meal_slot"?: string | null,"name"?: string,"protein_g"?: number,"serving_label"?: string | null,"servings"?: number | null,"synced_at"?: string,"up"?: number,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "food_logs_food_id_fkey"
      columns: ["food_id"]
isOneToOne: false
      referencedRelation: "foods"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "food_logs_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"foods": {
                  Row: {
                    "barcode": string | null,"brand": string | null,"cooked_g": number | null,"deleted": boolean,"group_name": string | null,"id": string,"ingredients": Json | null,"kind": string,"name": string,"owner_id": string | null,"per100": Json | null,"servings": NonNullable<Json>,"source": string,"synced_at": string,"up": number
                  }
                  Insert: {
                    "barcode"?: string | null,"brand"?: string | null,"cooked_g"?: number | null,"deleted"?: boolean,"group_name"?: string | null,"id": string,"ingredients"?: Json | null,"kind"?: string,"name": string,"owner_id"?: string | null,"per100"?: Json | null,"servings"?: NonNullable<Json>,"source"?: string,"synced_at"?: string,"up"?: number
                  }
                  Update: {
                    "barcode"?: string | null,"brand"?: string | null,"cooked_g"?: number | null,"deleted"?: boolean,"group_name"?: string | null,"id"?: string,"ingredients"?: Json | null,"kind"?: string,"name"?: string,"owner_id"?: string | null,"per100"?: Json | null,"servings"?: NonNullable<Json>,"source"?: string,"synced_at"?: string,"up"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "foods_owner_id_fkey"
      columns: ["owner_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"gym_equipment": {
                  Row: {
                    "capabilities": (string)[],"catalog_id": string | null,"custom_name": string | null,"deleted": boolean,"gym_profile_id": string,"id": string,"synced_at": string,"up": number,"user_id": string,"weights": Json | null
                  }
                  Insert: {
                    "capabilities": (string)[],"catalog_id"?: string | null,"custom_name"?: string | null,"deleted"?: boolean,"gym_profile_id": string,"id": string,"synced_at"?: string,"up"?: number,"user_id": string,"weights"?: Json | null
                  }
                  Update: {
                    "capabilities"?: (string)[],"catalog_id"?: string | null,"custom_name"?: string | null,"deleted"?: boolean,"gym_profile_id"?: string,"id"?: string,"synced_at"?: string,"up"?: number,"user_id"?: string,"weights"?: Json | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "gym_equipment_catalog_id_fkey"
      columns: ["catalog_id"]
isOneToOne: false
      referencedRelation: "equipment_catalog"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "gym_equipment_gym_profile_id_fkey"
      columns: ["gym_profile_id"]
isOneToOne: false
      referencedRelation: "gym_profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "gym_equipment_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"gym_profiles": {
                  Row: {
                    "assume_full": boolean,"deleted": boolean,"id": string,"is_default": boolean,"kind": string,"name": string,"synced_at": string,"up": number,"user_id": string
                  }
                  Insert: {
                    "assume_full"?: boolean,"deleted"?: boolean,"id": string,"is_default"?: boolean,"kind"?: string,"name": string,"synced_at"?: string,"up"?: number,"user_id": string
                  }
                  Update: {
                    "assume_full"?: boolean,"deleted"?: boolean,"id"?: string,"is_default"?: boolean,"kind"?: string,"name"?: string,"synced_at"?: string,"up"?: number,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "gym_profiles_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"photos": {
                  Row: {
                    "checkin_id": string | null,"deleted": boolean,"id": string,"note": string | null,"pose": string | null,"remote": boolean,"storage_path": string,"synced_at": string,"taken_on": string,"up": number,"user_id": string
                  }
                  Insert: {
                    "checkin_id"?: string | null,"deleted"?: boolean,"id": string,"note"?: string | null,"pose"?: string | null,"remote"?: boolean,"storage_path": string,"synced_at"?: string,"taken_on": string,"up"?: number,"user_id": string
                  }
                  Update: {
                    "checkin_id"?: string | null,"deleted"?: boolean,"id"?: string,"note"?: string | null,"pose"?: string | null,"remote"?: boolean,"storage_path"?: string,"synced_at"?: string,"taken_on"?: string,"up"?: number,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "photos_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"profiles": {
                  Row: {
                    "birth_year": number | null,"created_at": string,"deleted": boolean,"display_name": string | null,"goal_weight_kg": number | null,"height_cm": number | null,"id": string,"questionnaire": Json | null,"sex": string | null,"start_weight_kg": number | null,"synced_at": string,"timezone": string,"units": string,"up": number
                  }
                  Insert: {
                    "birth_year"?: number | null,"created_at"?: string,"deleted"?: boolean,"display_name"?: string | null,"goal_weight_kg"?: number | null,"height_cm"?: number | null,"id": string,"questionnaire"?: Json | null,"sex"?: string | null,"start_weight_kg"?: number | null,"synced_at"?: string,"timezone"?: string,"units"?: string,"up"?: number
                  }
                  Update: {
                    "birth_year"?: number | null,"created_at"?: string,"deleted"?: boolean,"display_name"?: string | null,"goal_weight_kg"?: number | null,"height_cm"?: number | null,"id"?: string,"questionnaire"?: Json | null,"sex"?: string | null,"start_weight_kg"?: number | null,"synced_at"?: string,"timezone"?: string,"units"?: string,"up"?: number
                  }
                  Relationships: [
                    
                  ]
                },"targets": {
                  Row: {
                    "carbs_g": number,"deleted": boolean,"effective_from": string,"fat_g": number,"id": string,"kcal": number,"kcal_train": number | null,"protein_g": number,"set_by": string,"set_by_id": string | null,"synced_at": string,"up": number,"user_id": string,"water_ml": number
                  }
                  Insert: {
                    "carbs_g": number,"deleted"?: boolean,"effective_from": string,"fat_g": number,"id": string,"kcal": number,"kcal_train"?: number | null,"protein_g": number,"set_by"?: string,"set_by_id"?: string | null,"synced_at"?: string,"up"?: number,"user_id": string,"water_ml"?: number
                  }
                  Update: {
                    "carbs_g"?: number,"deleted"?: boolean,"effective_from"?: string,"fat_g"?: number,"id"?: string,"kcal"?: number,"kcal_train"?: number | null,"protein_g"?: number,"set_by"?: string,"set_by_id"?: string | null,"synced_at"?: string,"up"?: number,"user_id"?: string,"water_ml"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "targets_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"water_logs": {
                  Row: {
                    "at": string,"deleted": boolean,"id": string,"ml": number,"synced_at": string,"up": number,"user_id": string
                  }
                  Insert: {
                    "at": string,"deleted"?: boolean,"id": string,"ml": number,"synced_at"?: string,"up"?: number,"user_id": string
                  }
                  Update: {
                    "at"?: string,"deleted"?: boolean,"id"?: string,"ml"?: number,"synced_at"?: string,"up"?: number,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "water_logs_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                }
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "has_pro":
{ Args: { "uid": string }; Returns: boolean
                           },
"upsert_lww":
{ Args: { "rows": Json,"tbl": string }; Returns: Json
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
      Row: infer R
    }
    ? R
    : never
  : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
  ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
  : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "graphql_public": {
          Enums: {
            
          }
        },"public": {
          Enums: {
            
          }
        }
} as const
