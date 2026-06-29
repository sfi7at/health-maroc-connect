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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      admin_audit_log: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          entity_id: string | null
          entity_type: string | null
          id: string
          metadata: Json
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          metadata?: Json
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          metadata?: Json
        }
        Relationships: []
      }
      allergies: {
        Row: {
          created_at: string
          id: string
          name: string
          reaction: string | null
          severity: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          reaction?: string | null
          severity?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          reaction?: string | null
          severity?: string | null
          user_id?: string
        }
        Relationships: []
      }
      appointment_waitlist: {
        Row: {
          created_at: string
          id: string
          notes: string | null
          notified_at: string | null
          patient_id: string
          preferred_date: string | null
          preferred_period: string | null
          provider_id: string
          service_id: string | null
          status: string
        }
        Insert: {
          created_at?: string
          id?: string
          notes?: string | null
          notified_at?: string | null
          patient_id: string
          preferred_date?: string | null
          preferred_period?: string | null
          provider_id: string
          service_id?: string | null
          status?: string
        }
        Update: {
          created_at?: string
          id?: string
          notes?: string | null
          notified_at?: string | null
          patient_id?: string
          preferred_date?: string | null
          preferred_period?: string | null
          provider_id?: string
          service_id?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointment_waitlist_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "providers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointment_waitlist_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "provider_services"
            referencedColumns: ["id"]
          },
        ]
      }
      appointments: {
        Row: {
          cancelled_reason: string | null
          completed_at: string | null
          confirmed_at: string | null
          consultation_type: string
          created_at: string
          duration_minutes: number
          id: string
          location_text: string | null
          notes: string | null
          patient_id: string
          provider_id: string
          reason: string | null
          reminder_24h_sent_at: string | null
          reminder_2h_sent_at: string | null
          reminder_30m_sent_at: string | null
          reminder_sent_at: string | null
          rescheduled_from: string | null
          scheduled_for: string
          service_id: string | null
          status: Database["public"]["Enums"]["appointment_status"]
          updated_at: string
        }
        Insert: {
          cancelled_reason?: string | null
          completed_at?: string | null
          confirmed_at?: string | null
          consultation_type?: string
          created_at?: string
          duration_minutes?: number
          id?: string
          location_text?: string | null
          notes?: string | null
          patient_id: string
          provider_id: string
          reason?: string | null
          reminder_24h_sent_at?: string | null
          reminder_2h_sent_at?: string | null
          reminder_30m_sent_at?: string | null
          reminder_sent_at?: string | null
          rescheduled_from?: string | null
          scheduled_for: string
          service_id?: string | null
          status?: Database["public"]["Enums"]["appointment_status"]
          updated_at?: string
        }
        Update: {
          cancelled_reason?: string | null
          completed_at?: string | null
          confirmed_at?: string | null
          consultation_type?: string
          created_at?: string
          duration_minutes?: number
          id?: string
          location_text?: string | null
          notes?: string | null
          patient_id?: string
          provider_id?: string
          reason?: string | null
          reminder_24h_sent_at?: string | null
          reminder_2h_sent_at?: string | null
          reminder_30m_sent_at?: string | null
          reminder_sent_at?: string | null
          rescheduled_from?: string | null
          scheduled_for?: string
          service_id?: string | null
          status?: Database["public"]["Enums"]["appointment_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointments_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "providers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_rescheduled_from_fkey"
            columns: ["rescheduled_from"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "provider_services"
            referencedColumns: ["id"]
          },
        ]
      }
      articles: {
        Row: {
          author_id: string | null
          author_name: string | null
          category: string | null
          content: string | null
          cover_image: string | null
          created_at: string
          description: string | null
          id: string
          is_published: boolean
          language: Database["public"]["Enums"]["article_language"]
          published_at: string | null
          slug: string
          tags: string[]
          title: string
          updated_at: string
        }
        Insert: {
          author_id?: string | null
          author_name?: string | null
          category?: string | null
          content?: string | null
          cover_image?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_published?: boolean
          language?: Database["public"]["Enums"]["article_language"]
          published_at?: string | null
          slug: string
          tags?: string[]
          title: string
          updated_at?: string
        }
        Update: {
          author_id?: string | null
          author_name?: string | null
          category?: string | null
          content?: string | null
          cover_image?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_published?: boolean
          language?: Database["public"]["Enums"]["article_language"]
          published_at?: string | null
          slug?: string
          tags?: string[]
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      blood_campaign_registrations: {
        Row: {
          campaign_id: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          campaign_id: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          campaign_id?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "blood_campaign_registrations_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "blood_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      blood_campaigns: {
        Row: {
          address: string | null
          city_id: string | null
          contact_phone: string | null
          cover_image: string | null
          created_at: string
          created_by: string | null
          description: string | null
          ends_at: string | null
          id: string
          is_published: boolean
          latitude: number | null
          longitude: number | null
          organizer: string
          province_id: string | null
          starts_at: string
          title: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          city_id?: string | null
          contact_phone?: string | null
          cover_image?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          ends_at?: string | null
          id?: string
          is_published?: boolean
          latitude?: number | null
          longitude?: number | null
          organizer: string
          province_id?: string | null
          starts_at: string
          title: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          city_id?: string | null
          contact_phone?: string | null
          cover_image?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          ends_at?: string | null
          id?: string
          is_published?: boolean
          latitude?: number | null
          longitude?: number | null
          organizer?: string
          province_id?: string | null
          starts_at?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "blood_campaigns_city_id_fkey"
            columns: ["city_id"]
            isOneToOne: false
            referencedRelation: "cities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blood_campaigns_province_id_fkey"
            columns: ["province_id"]
            isOneToOne: false
            referencedRelation: "provinces"
            referencedColumns: ["id"]
          },
        ]
      }
      blood_chat_messages: {
        Row: {
          body: string | null
          created_at: string
          id: string
          kind: string
          metadata: Json | null
          read_at: string | null
          recipient_id: string
          request_id: string
          sender_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          kind?: string
          metadata?: Json | null
          read_at?: string | null
          recipient_id: string
          request_id: string
          sender_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          kind?: string
          metadata?: Json | null
          read_at?: string | null
          recipient_id?: string
          request_id?: string
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "blood_chat_messages_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "blood_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      blood_compatibility: {
        Row: {
          donor: Database["public"]["Enums"]["blood_group"]
          recipient: Database["public"]["Enums"]["blood_group"]
        }
        Insert: {
          donor: Database["public"]["Enums"]["blood_group"]
          recipient: Database["public"]["Enums"]["blood_group"]
        }
        Update: {
          donor?: Database["public"]["Enums"]["blood_group"]
          recipient?: Database["public"]["Enums"]["blood_group"]
        }
        Relationships: []
      }
      blood_donors: {
        Row: {
          availability_radius_km: number
          avatar_url: string | null
          birth_date: string | null
          blood_group: Database["public"]["Enums"]["blood_group"]
          city_id: string | null
          contact_email: string | null
          contact_phone: string | null
          created_at: string
          first_name: string | null
          gender: string | null
          id: string
          is_available: boolean
          is_verified: boolean
          last_active_at: string
          last_donation_at: string | null
          last_name: string | null
          latitude: number | null
          longitude: number | null
          notes: string | null
          notify_email: boolean
          notify_push: boolean
          notify_sms: boolean
          province_id: string | null
          status: Database["public"]["Enums"]["donor_status"]
          total_donations: number
          updated_at: string
          weight_kg: number | null
        }
        Insert: {
          availability_radius_km?: number
          avatar_url?: string | null
          birth_date?: string | null
          blood_group: Database["public"]["Enums"]["blood_group"]
          city_id?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          first_name?: string | null
          gender?: string | null
          id: string
          is_available?: boolean
          is_verified?: boolean
          last_active_at?: string
          last_donation_at?: string | null
          last_name?: string | null
          latitude?: number | null
          longitude?: number | null
          notes?: string | null
          notify_email?: boolean
          notify_push?: boolean
          notify_sms?: boolean
          province_id?: string | null
          status?: Database["public"]["Enums"]["donor_status"]
          total_donations?: number
          updated_at?: string
          weight_kg?: number | null
        }
        Update: {
          availability_radius_km?: number
          avatar_url?: string | null
          birth_date?: string | null
          blood_group?: Database["public"]["Enums"]["blood_group"]
          city_id?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          first_name?: string | null
          gender?: string | null
          id?: string
          is_available?: boolean
          is_verified?: boolean
          last_active_at?: string
          last_donation_at?: string | null
          last_name?: string | null
          latitude?: number | null
          longitude?: number | null
          notes?: string | null
          notify_email?: boolean
          notify_push?: boolean
          notify_sms?: boolean
          province_id?: string | null
          status?: Database["public"]["Enums"]["donor_status"]
          total_donations?: number
          updated_at?: string
          weight_kg?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "blood_donors_city_id_fkey"
            columns: ["city_id"]
            isOneToOne: false
            referencedRelation: "cities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blood_donors_province_id_fkey"
            columns: ["province_id"]
            isOneToOne: false
            referencedRelation: "provinces"
            referencedColumns: ["id"]
          },
        ]
      }
      blood_request_responses: {
        Row: {
          created_at: string
          donor_id: string
          id: string
          message: string | null
          request_id: string
          status: Database["public"]["Enums"]["blood_response_status"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          donor_id: string
          id?: string
          message?: string | null
          request_id: string
          status?: Database["public"]["Enums"]["blood_response_status"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          donor_id?: string
          id?: string
          message?: string | null
          request_id?: string
          status?: Database["public"]["Enums"]["blood_response_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "blood_request_responses_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "blood_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      blood_requests: {
        Row: {
          address: string | null
          blood_group: Database["public"]["Enums"]["blood_group"]
          city_id: string | null
          contact_name: string | null
          contact_phone: string
          created_at: string
          hospital_name: string | null
          id: string
          is_emergency: boolean
          latitude: number | null
          longitude: number | null
          needed_by: string | null
          notes: string | null
          patient_name: string
          province_id: string | null
          requester_id: string
          status: Database["public"]["Enums"]["blood_request_status"]
          units_needed: number
          updated_at: string
          urgency: Database["public"]["Enums"]["blood_request_urgency"]
        }
        Insert: {
          address?: string | null
          blood_group: Database["public"]["Enums"]["blood_group"]
          city_id?: string | null
          contact_name?: string | null
          contact_phone: string
          created_at?: string
          hospital_name?: string | null
          id?: string
          is_emergency?: boolean
          latitude?: number | null
          longitude?: number | null
          needed_by?: string | null
          notes?: string | null
          patient_name: string
          province_id?: string | null
          requester_id: string
          status?: Database["public"]["Enums"]["blood_request_status"]
          units_needed?: number
          updated_at?: string
          urgency?: Database["public"]["Enums"]["blood_request_urgency"]
        }
        Update: {
          address?: string | null
          blood_group?: Database["public"]["Enums"]["blood_group"]
          city_id?: string | null
          contact_name?: string | null
          contact_phone?: string
          created_at?: string
          hospital_name?: string | null
          id?: string
          is_emergency?: boolean
          latitude?: number | null
          longitude?: number | null
          needed_by?: string | null
          notes?: string | null
          patient_name?: string
          province_id?: string | null
          requester_id?: string
          status?: Database["public"]["Enums"]["blood_request_status"]
          units_needed?: number
          updated_at?: string
          urgency?: Database["public"]["Enums"]["blood_request_urgency"]
        }
        Relationships: [
          {
            foreignKeyName: "blood_requests_city_id_fkey"
            columns: ["city_id"]
            isOneToOne: false
            referencedRelation: "cities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blood_requests_province_id_fkey"
            columns: ["province_id"]
            isOneToOne: false
            referencedRelation: "provinces"
            referencedColumns: ["id"]
          },
        ]
      }
      cities: {
        Row: {
          created_at: string
          id: string
          latitude: number | null
          longitude: number | null
          name_ar: string | null
          name_fr: string
          province_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          latitude?: number | null
          longitude?: number | null
          name_ar?: string | null
          name_fr: string
          province_id: string
        }
        Update: {
          created_at?: string
          id?: string
          latitude?: number | null
          longitude?: number | null
          name_ar?: string | null
          name_fr?: string
          province_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cities_province_id_fkey"
            columns: ["province_id"]
            isOneToOne: false
            referencedRelation: "provinces"
            referencedColumns: ["id"]
          },
        ]
      }
      districts: {
        Row: {
          city_id: string
          created_at: string
          id: string
          name_ar: string | null
          name_fr: string
        }
        Insert: {
          city_id: string
          created_at?: string
          id?: string
          name_ar?: string | null
          name_fr: string
        }
        Update: {
          city_id?: string
          created_at?: string
          id?: string
          name_ar?: string | null
          name_fr?: string
        }
        Relationships: [
          {
            foreignKeyName: "districts_city_id_fkey"
            columns: ["city_id"]
            isOneToOne: false
            referencedRelation: "cities"
            referencedColumns: ["id"]
          },
        ]
      }
      donation_history: {
        Row: {
          blood_center_id: string | null
          city_id: string | null
          created_at: string
          donated_at: string
          donor_id: string
          id: string
          location: string | null
          notes: string | null
          units: number
        }
        Insert: {
          blood_center_id?: string | null
          city_id?: string | null
          created_at?: string
          donated_at: string
          donor_id: string
          id?: string
          location?: string | null
          notes?: string | null
          units?: number
        }
        Update: {
          blood_center_id?: string | null
          city_id?: string | null
          created_at?: string
          donated_at?: string
          donor_id?: string
          id?: string
          location?: string | null
          notes?: string | null
          units?: number
        }
        Relationships: [
          {
            foreignKeyName: "donation_history_blood_center_id_fkey"
            columns: ["blood_center_id"]
            isOneToOne: false
            referencedRelation: "providers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "donation_history_city_id_fkey"
            columns: ["city_id"]
            isOneToOne: false
            referencedRelation: "cities"
            referencedColumns: ["id"]
          },
        ]
      }
      emergency_contacts: {
        Row: {
          created_at: string
          email: string | null
          full_name: string
          id: string
          phone: string
          relation: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name: string
          id?: string
          phone: string
          relation?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          phone?: string
          relation?: string | null
          user_id?: string
        }
        Relationships: []
      }
      favorites: {
        Row: {
          created_at: string
          provider_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          provider_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          provider_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "favorites_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "providers"
            referencedColumns: ["id"]
          },
        ]
      }
      medical_conditions: {
        Row: {
          created_at: string
          diagnosed_at: string | null
          id: string
          name: string
          notes: string | null
          status: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          diagnosed_at?: string | null
          id?: string
          name: string
          notes?: string | null
          status?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          diagnosed_at?: string | null
          id?: string
          name?: string
          notes?: string | null
          status?: string | null
          user_id?: string
        }
        Relationships: []
      }
      medical_documents: {
        Row: {
          category: string | null
          created_at: string
          description: string | null
          id: string
          mime_type: string | null
          size_bytes: number | null
          storage_path: string
          title: string
          user_id: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          mime_type?: string | null
          size_bytes?: number | null
          storage_path: string
          title: string
          user_id: string
        }
        Update: {
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          mime_type?: string | null
          size_bytes?: number | null
          storage_path?: string
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      medical_profiles: {
        Row: {
          blood_group: Database["public"]["Enums"]["blood_group"] | null
          chronic_conditions: string | null
          created_at: string
          date_of_birth: string | null
          gender: string | null
          height_cm: number | null
          notes: string | null
          updated_at: string
          user_id: string
          weight_kg: number | null
        }
        Insert: {
          blood_group?: Database["public"]["Enums"]["blood_group"] | null
          chronic_conditions?: string | null
          created_at?: string
          date_of_birth?: string | null
          gender?: string | null
          height_cm?: number | null
          notes?: string | null
          updated_at?: string
          user_id: string
          weight_kg?: number | null
        }
        Update: {
          blood_group?: Database["public"]["Enums"]["blood_group"] | null
          chronic_conditions?: string | null
          created_at?: string
          date_of_birth?: string | null
          gender?: string | null
          height_cm?: number | null
          notes?: string | null
          updated_at?: string
          user_id?: string
          weight_kg?: number | null
        }
        Relationships: []
      }
      medical_reports: {
        Row: {
          created_at: string
          id: string
          provider_id: string | null
          report_date: string | null
          storage_path: string | null
          summary: string | null
          title: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          provider_id?: string | null
          report_date?: string | null
          storage_path?: string | null
          summary?: string | null
          title: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          provider_id?: string | null
          report_date?: string | null
          storage_path?: string | null
          summary?: string | null
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "medical_reports_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "providers"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_preferences: {
        Row: {
          appointments: boolean
          blood_requests: boolean
          email_enabled: boolean
          emergencies: boolean
          medical_tips: boolean
          push_enabled: boolean
          sms_enabled: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          appointments?: boolean
          blood_requests?: boolean
          email_enabled?: boolean
          emergencies?: boolean
          medical_tips?: boolean
          push_enabled?: boolean
          sms_enabled?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          appointments?: boolean
          blood_requests?: boolean
          email_enabled?: boolean
          emergencies?: boolean
          medical_tips?: boolean
          push_enabled?: boolean
          sms_enabled?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          data: Json
          id: string
          is_read: boolean
          read_at: string | null
          title: string
          type: Database["public"]["Enums"]["notification_type"]
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          data?: Json
          id?: string
          is_read?: boolean
          read_at?: string | null
          title: string
          type?: Database["public"]["Enums"]["notification_type"]
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          data?: Json
          id?: string
          is_read?: boolean
          read_at?: string | null
          title?: string
          type?: Database["public"]["Enums"]["notification_type"]
          user_id?: string
        }
        Relationships: []
      }
      pharmacies_on_duty: {
        Row: {
          city_id: string
          created_at: string
          day_shift: boolean
          duty_date: string
          id: string
          is_emergency: boolean
          is_verified: boolean
          night_shift: boolean
          notes: string | null
          provider_id: string
          province_id: string | null
          updated_at: string
        }
        Insert: {
          city_id: string
          created_at?: string
          day_shift?: boolean
          duty_date: string
          id?: string
          is_emergency?: boolean
          is_verified?: boolean
          night_shift?: boolean
          notes?: string | null
          provider_id: string
          province_id?: string | null
          updated_at?: string
        }
        Update: {
          city_id?: string
          created_at?: string
          day_shift?: boolean
          duty_date?: string
          id?: string
          is_emergency?: boolean
          is_verified?: boolean
          night_shift?: boolean
          notes?: string | null
          provider_id?: string
          province_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pharmacies_on_duty_city_id_fkey"
            columns: ["city_id"]
            isOneToOne: false
            referencedRelation: "cities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pharmacies_on_duty_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "providers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pharmacies_on_duty_province_id_fkey"
            columns: ["province_id"]
            isOneToOne: false
            referencedRelation: "provinces"
            referencedColumns: ["id"]
          },
        ]
      }
      prescriptions: {
        Row: {
          created_at: string
          dosage: string | null
          duration: string | null
          frequency: string | null
          id: string
          medication: string
          notes: string | null
          prescribed_at: string
          prescribed_by: string | null
          storage_path: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          dosage?: string | null
          duration?: string | null
          frequency?: string | null
          id?: string
          medication: string
          notes?: string | null
          prescribed_at?: string
          prescribed_by?: string | null
          storage_path?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          dosage?: string | null
          duration?: string | null
          frequency?: string | null
          id?: string
          medication?: string
          notes?: string | null
          prescribed_at?: string
          prescribed_by?: string | null
          storage_path?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "prescriptions_prescribed_by_fkey"
            columns: ["prescribed_by"]
            isOneToOne: false
            referencedRelation: "providers"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          city: string | null
          city_id: string | null
          created_at: string
          first_name: string | null
          full_name: string | null
          id: string
          language: string
          last_name: string | null
          phone: string | null
          terms_accepted_at: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          city?: string | null
          city_id?: string | null
          created_at?: string
          first_name?: string | null
          full_name?: string | null
          id: string
          language?: string
          last_name?: string | null
          phone?: string | null
          terms_accepted_at?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          city?: string | null
          city_id?: string | null
          created_at?: string
          first_name?: string | null
          full_name?: string | null
          id?: string
          language?: string
          last_name?: string | null
          phone?: string | null
          terms_accepted_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_city_id_fkey"
            columns: ["city_id"]
            isOneToOne: false
            referencedRelation: "cities"
            referencedColumns: ["id"]
          },
        ]
      }
      provider_blocked_dates: {
        Row: {
          created_at: string
          end_at: string
          id: string
          provider_id: string
          reason: string | null
          start_at: string
        }
        Insert: {
          created_at?: string
          end_at: string
          id?: string
          provider_id: string
          reason?: string | null
          start_at: string
        }
        Update: {
          created_at?: string
          end_at?: string
          id?: string
          provider_id?: string
          reason?: string | null
          start_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "provider_blocked_dates_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "providers"
            referencedColumns: ["id"]
          },
        ]
      }
      provider_schedules: {
        Row: {
          break_end: string | null
          break_start: string | null
          created_at: string
          end_time: string
          id: string
          is_active: boolean
          max_per_day: number | null
          provider_id: string
          slot_minutes: number
          start_time: string
          updated_at: string
          weekday: number
        }
        Insert: {
          break_end?: string | null
          break_start?: string | null
          created_at?: string
          end_time: string
          id?: string
          is_active?: boolean
          max_per_day?: number | null
          provider_id: string
          slot_minutes?: number
          start_time: string
          updated_at?: string
          weekday: number
        }
        Update: {
          break_end?: string | null
          break_start?: string | null
          created_at?: string
          end_time?: string
          id?: string
          is_active?: boolean
          max_per_day?: number | null
          provider_id?: string
          slot_minutes?: number
          start_time?: string
          updated_at?: string
          weekday?: number
        }
        Relationships: [
          {
            foreignKeyName: "provider_schedules_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "providers"
            referencedColumns: ["id"]
          },
        ]
      }
      provider_services: {
        Row: {
          category: string | null
          created_at: string
          description: string | null
          duration_minutes: number
          id: string
          is_active: boolean
          is_online_eligible: boolean
          name: string
          preparation: string | null
          price_mad: number | null
          provider_id: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          description?: string | null
          duration_minutes?: number
          id?: string
          is_active?: boolean
          is_online_eligible?: boolean
          name: string
          preparation?: string | null
          price_mad?: number | null
          provider_id: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          category?: string | null
          created_at?: string
          description?: string | null
          duration_minutes?: number
          id?: string
          is_active?: boolean
          is_online_eligible?: boolean
          name?: string
          preparation?: string | null
          price_mad?: number | null
          provider_id?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "provider_services_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "providers"
            referencedColumns: ["id"]
          },
        ]
      }
      provider_specialties: {
        Row: {
          provider_id: string
          specialty_id: string
        }
        Insert: {
          provider_id: string
          specialty_id: string
        }
        Update: {
          provider_id?: string
          specialty_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "provider_specialties_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "providers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "provider_specialties_specialty_id_fkey"
            columns: ["specialty_id"]
            isOneToOne: false
            referencedRelation: "specialties"
            referencedColumns: ["id"]
          },
        ]
      }
      providers: {
        Row: {
          address: string | null
          average_rating: number
          category: Database["public"]["Enums"]["provider_category"]
          city_id: string | null
          cover_image: string | null
          created_at: string
          description: string | null
          district_id: string | null
          email: string | null
          id: string
          is_active: boolean
          is_premium: boolean
          is_verified: boolean
          latitude: number | null
          longitude: number | null
          metadata: Json
          name: string
          owner_id: string | null
          phone: string | null
          profile_image: string | null
          reviews_count: number
          slug: string | null
          updated_at: string
          website: string | null
          working_hours: Json
        }
        Insert: {
          address?: string | null
          average_rating?: number
          category: Database["public"]["Enums"]["provider_category"]
          city_id?: string | null
          cover_image?: string | null
          created_at?: string
          description?: string | null
          district_id?: string | null
          email?: string | null
          id?: string
          is_active?: boolean
          is_premium?: boolean
          is_verified?: boolean
          latitude?: number | null
          longitude?: number | null
          metadata?: Json
          name: string
          owner_id?: string | null
          phone?: string | null
          profile_image?: string | null
          reviews_count?: number
          slug?: string | null
          updated_at?: string
          website?: string | null
          working_hours?: Json
        }
        Update: {
          address?: string | null
          average_rating?: number
          category?: Database["public"]["Enums"]["provider_category"]
          city_id?: string | null
          cover_image?: string | null
          created_at?: string
          description?: string | null
          district_id?: string | null
          email?: string | null
          id?: string
          is_active?: boolean
          is_premium?: boolean
          is_verified?: boolean
          latitude?: number | null
          longitude?: number | null
          metadata?: Json
          name?: string
          owner_id?: string | null
          phone?: string | null
          profile_image?: string | null
          reviews_count?: number
          slug?: string | null
          updated_at?: string
          website?: string | null
          working_hours?: Json
        }
        Relationships: [
          {
            foreignKeyName: "providers_city_id_fkey"
            columns: ["city_id"]
            isOneToOne: false
            referencedRelation: "cities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "providers_district_id_fkey"
            columns: ["district_id"]
            isOneToOne: false
            referencedRelation: "districts"
            referencedColumns: ["id"]
          },
        ]
      }
      provinces: {
        Row: {
          code: string | null
          created_at: string
          id: string
          name_ar: string | null
          name_fr: string
          region_id: string
        }
        Insert: {
          code?: string | null
          created_at?: string
          id?: string
          name_ar?: string | null
          name_fr: string
          region_id: string
        }
        Update: {
          code?: string | null
          created_at?: string
          id?: string
          name_ar?: string | null
          name_fr?: string
          region_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "provinces_region_id_fkey"
            columns: ["region_id"]
            isOneToOne: false
            referencedRelation: "regions"
            referencedColumns: ["id"]
          },
        ]
      }
      regions: {
        Row: {
          code: string | null
          created_at: string
          id: string
          name_ar: string | null
          name_fr: string
        }
        Insert: {
          code?: string | null
          created_at?: string
          id?: string
          name_ar?: string | null
          name_fr: string
        }
        Update: {
          code?: string | null
          created_at?: string
          id?: string
          name_ar?: string | null
          name_fr?: string
        }
        Relationships: []
      }
      reviews: {
        Row: {
          author_id: string
          comment: string | null
          created_at: string
          id: string
          photos: string[]
          provider_id: string
          provider_response: string | null
          provider_response_at: string | null
          rating: number
          updated_at: string
        }
        Insert: {
          author_id: string
          comment?: string | null
          created_at?: string
          id?: string
          photos?: string[]
          provider_id: string
          provider_response?: string | null
          provider_response_at?: string | null
          rating: number
          updated_at?: string
        }
        Update: {
          author_id?: string
          comment?: string | null
          created_at?: string
          id?: string
          photos?: string[]
          provider_id?: string
          provider_response?: string | null
          provider_response_at?: string | null
          rating?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "providers"
            referencedColumns: ["id"]
          },
        ]
      }
      specialties: {
        Row: {
          category: Database["public"]["Enums"]["provider_category"] | null
          created_at: string
          icon: string | null
          id: string
          name_ar: string | null
          name_fr: string
          slug: string
        }
        Insert: {
          category?: Database["public"]["Enums"]["provider_category"] | null
          created_at?: string
          icon?: string | null
          id?: string
          name_ar?: string | null
          name_fr: string
          slug: string
        }
        Update: {
          category?: Database["public"]["Enums"]["provider_category"] | null
          created_at?: string
          icon?: string | null
          id?: string
          name_ar?: string | null
          name_fr?: string
          slug?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      vaccinations: {
        Row: {
          created_at: string
          dose: string | null
          id: string
          name: string
          next_due_at: string | null
          provider: string | null
          user_id: string
          vaccinated_at: string | null
        }
        Insert: {
          created_at?: string
          dose?: string | null
          id?: string
          name: string
          next_due_at?: string | null
          provider?: string | null
          user_id: string
          vaccinated_at?: string | null
        }
        Update: {
          created_at?: string
          dose?: string | null
          id?: string
          name?: string
          next_due_at?: string | null
          provider?: string | null
          user_id?: string
          vaccinated_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_chat_on_request: {
        Args: { _request: string; _user: string }
        Returns: boolean
      }
      get_donor_contact_for_request: {
        Args: { _donor: string; _request: string }
        Returns: {
          contact_email: string
          contact_phone: string
        }[]
      }
      get_my_donor_profile: {
        Args: never
        Returns: {
          availability_radius_km: number
          avatar_url: string | null
          birth_date: string | null
          blood_group: Database["public"]["Enums"]["blood_group"]
          city_id: string | null
          contact_email: string | null
          contact_phone: string | null
          created_at: string
          first_name: string | null
          gender: string | null
          id: string
          is_available: boolean
          is_verified: boolean
          last_active_at: string
          last_donation_at: string | null
          last_name: string | null
          latitude: number | null
          longitude: number | null
          notes: string | null
          notify_email: boolean
          notify_push: boolean
          notify_sms: boolean
          province_id: string | null
          status: Database["public"]["Enums"]["donor_status"]
          total_donations: number
          updated_at: string
          weight_kg: number | null
        }
        SetofOptions: {
          from: "*"
          to: "blood_donors"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      owns_provider: {
        Args: { _provider_id: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role:
        | "admin"
        | "moderator"
        | "user"
        | "citizen"
        | "blood_donor"
        | "doctor"
        | "dentist"
        | "pharmacist"
        | "laboratory"
        | "clinic"
        | "hospital"
        | "blood_center"
        | "content_manager"
        | "verification_manager"
        | "support_agent"
        | "analytics_viewer"
      appointment_status:
        | "pending"
        | "approved"
        | "rejected"
        | "cancelled"
        | "completed"
        | "no_show"
        | "rescheduled"
      article_language: "fr" | "ar" | "en"
      blood_group: "A+" | "A-" | "B+" | "B-" | "AB+" | "AB-" | "O+" | "O-"
      blood_request_status: "open" | "fulfilled" | "expired" | "cancelled"
      blood_request_urgency: "low" | "normal" | "high" | "critical"
      blood_response_status: "pending" | "accepted" | "declined" | "cancelled"
      donor_status:
        | "available"
        | "unavailable"
        | "busy"
        | "traveling"
        | "inactive"
      notification_type:
        | "push"
        | "email"
        | "blood_request"
        | "appointment"
        | "emergency"
        | "medical_tip"
        | "system"
      provider_category:
        | "doctor"
        | "dentist"
        | "pharmacy"
        | "laboratory"
        | "clinic"
        | "hospital"
        | "blood_center"
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
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
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
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
      app_role: [
        "admin",
        "moderator",
        "user",
        "citizen",
        "blood_donor",
        "doctor",
        "dentist",
        "pharmacist",
        "laboratory",
        "clinic",
        "hospital",
        "blood_center",
        "content_manager",
        "verification_manager",
        "support_agent",
        "analytics_viewer",
      ],
      appointment_status: [
        "pending",
        "approved",
        "rejected",
        "cancelled",
        "completed",
        "no_show",
        "rescheduled",
      ],
      article_language: ["fr", "ar", "en"],
      blood_group: ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"],
      blood_request_status: ["open", "fulfilled", "expired", "cancelled"],
      blood_request_urgency: ["low", "normal", "high", "critical"],
      blood_response_status: ["pending", "accepted", "declined", "cancelled"],
      donor_status: [
        "available",
        "unavailable",
        "busy",
        "traveling",
        "inactive",
      ],
      notification_type: [
        "push",
        "email",
        "blood_request",
        "appointment",
        "emergency",
        "medical_tip",
        "system",
      ],
      provider_category: [
        "doctor",
        "dentist",
        "pharmacy",
        "laboratory",
        "clinic",
        "hospital",
        "blood_center",
      ],
    },
  },
} as const
