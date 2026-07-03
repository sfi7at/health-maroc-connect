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
          actor_role: string | null
          after_state: Json | null
          before_state: Json | null
          created_at: string
          entity_id: string | null
          entity_type: string | null
          id: string
          ip_address: unknown
          metadata: Json
          severity: string
          user_agent: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          actor_role?: string | null
          after_state?: Json | null
          before_state?: Json | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          ip_address?: unknown
          metadata?: Json
          severity?: string
          user_agent?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          actor_role?: string | null
          after_state?: Json | null
          before_state?: Json | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          ip_address?: unknown
          metadata?: Json
          severity?: string
          user_agent?: string | null
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
      analytics_events: {
        Row: {
          city_id: string | null
          created_at: string
          event_category: string | null
          event_name: string
          id: number
          properties: Json
          referrer: string | null
          session_id: string | null
          url: string | null
          user_id: string | null
        }
        Insert: {
          city_id?: string | null
          created_at?: string
          event_category?: string | null
          event_name: string
          id?: number
          properties?: Json
          referrer?: string | null
          session_id?: string | null
          url?: string | null
          user_id?: string | null
        }
        Update: {
          city_id?: string | null
          created_at?: string
          event_category?: string | null
          event_name?: string
          id?: number
          properties?: Json
          referrer?: string | null
          session_id?: string | null
          url?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      api_metrics: {
        Row: {
          created_at: string
          duration_ms: number
          id: number
          method: string
          region: string | null
          route: string
          status_code: number
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          duration_ms: number
          id?: number
          method?: string
          region?: string | null
          route: string
          status_code: number
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          duration_ms?: number
          id?: number
          method?: string
          region?: string | null
          route?: string
          status_code?: number
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      app_settings: {
        Row: {
          category: string
          is_public: boolean
          key: string
          updated_at: string
          updated_by: string | null
          value: Json
        }
        Insert: {
          category?: string
          is_public?: boolean
          key: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Update: {
          category?: string
          is_public?: boolean
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
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
      article_categories: {
        Row: {
          created_at: string
          icon: string | null
          id: string
          is_active: boolean
          name_ar: string | null
          name_en: string | null
          name_fr: string
          slug: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          icon?: string | null
          id?: string
          is_active?: boolean
          name_ar?: string | null
          name_en?: string | null
          name_fr: string
          slug: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          icon?: string | null
          id?: string
          is_active?: boolean
          name_ar?: string | null
          name_en?: string | null
          name_fr?: string
          slug?: string
          sort_order?: number
        }
        Relationships: []
      }
      article_views: {
        Row: {
          article_id: string
          created_at: string
          duration_seconds: number | null
          id: string
          referrer: string | null
          session_id: string | null
          viewer_id: string | null
        }
        Insert: {
          article_id: string
          created_at?: string
          duration_seconds?: number | null
          id?: string
          referrer?: string | null
          session_id?: string | null
          viewer_id?: string | null
        }
        Update: {
          article_id?: string
          created_at?: string
          duration_seconds?: number | null
          id?: string
          referrer?: string | null
          session_id?: string | null
          viewer_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "article_views_article_id_fkey"
            columns: ["article_id"]
            isOneToOne: false
            referencedRelation: "articles"
            referencedColumns: ["id"]
          },
        ]
      }
      articles: {
        Row: {
          author_id: string | null
          author_name: string | null
          category: string | null
          city_id: string | null
          click_count: number
          content: string | null
          content_type: Database["public"]["Enums"]["content_type"]
          cover_image: string | null
          created_at: string
          description: string | null
          excerpt: string | null
          id: string
          is_featured: boolean
          is_pinned: boolean
          is_published: boolean
          language: Database["public"]["Enums"]["article_language"]
          published_at: string | null
          reading_time_minutes: number | null
          scheduled_at: string | null
          seo_description: string | null
          seo_title: string | null
          share_count: number
          slug: string
          status: Database["public"]["Enums"]["article_status"]
          tags: string[]
          title: string
          updated_at: string
          view_count: number
        }
        Insert: {
          author_id?: string | null
          author_name?: string | null
          category?: string | null
          city_id?: string | null
          click_count?: number
          content?: string | null
          content_type?: Database["public"]["Enums"]["content_type"]
          cover_image?: string | null
          created_at?: string
          description?: string | null
          excerpt?: string | null
          id?: string
          is_featured?: boolean
          is_pinned?: boolean
          is_published?: boolean
          language?: Database["public"]["Enums"]["article_language"]
          published_at?: string | null
          reading_time_minutes?: number | null
          scheduled_at?: string | null
          seo_description?: string | null
          seo_title?: string | null
          share_count?: number
          slug: string
          status?: Database["public"]["Enums"]["article_status"]
          tags?: string[]
          title: string
          updated_at?: string
          view_count?: number
        }
        Update: {
          author_id?: string | null
          author_name?: string | null
          category?: string | null
          city_id?: string | null
          click_count?: number
          content?: string | null
          content_type?: Database["public"]["Enums"]["content_type"]
          cover_image?: string | null
          created_at?: string
          description?: string | null
          excerpt?: string | null
          id?: string
          is_featured?: boolean
          is_pinned?: boolean
          is_published?: boolean
          language?: Database["public"]["Enums"]["article_language"]
          published_at?: string | null
          reading_time_minutes?: number | null
          scheduled_at?: string | null
          seo_description?: string | null
          seo_title?: string | null
          share_count?: number
          slug?: string
          status?: Database["public"]["Enums"]["article_status"]
          tags?: string[]
          title?: string
          updated_at?: string
          view_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "articles_city_id_fkey"
            columns: ["city_id"]
            isOneToOne: false
            referencedRelation: "cities"
            referencedColumns: ["id"]
          },
        ]
      }
      backup_runs: {
        Row: {
          duration_ms: number | null
          error: string | null
          finished_at: string | null
          id: string
          kind: string
          location: string | null
          size_bytes: number | null
          started_at: string
          status: string
        }
        Insert: {
          duration_ms?: number | null
          error?: string | null
          finished_at?: string | null
          id?: string
          kind: string
          location?: string | null
          size_bytes?: number | null
          started_at?: string
          status: string
        }
        Update: {
          duration_ms?: number | null
          error?: string | null
          finished_at?: string | null
          id?: string
          kind?: string
          location?: string | null
          size_bytes?: number | null
          started_at?: string
          status?: string
        }
        Relationships: []
      }
      blocked_entities: {
        Row: {
          blocked_by: string | null
          created_at: string
          expires_at: string | null
          id: string
          kind: string
          reason: string | null
          value: string
        }
        Insert: {
          blocked_by?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          kind: string
          reason?: string | null
          value: string
        }
        Update: {
          blocked_by?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          kind?: string
          reason?: string | null
          value?: string
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
      campaign_categories: {
        Row: {
          created_at: string
          icon: string | null
          id: string
          is_active: boolean
          name_ar: string | null
          name_en: string | null
          name_fr: string
          slug: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          icon?: string | null
          id?: string
          is_active?: boolean
          name_ar?: string | null
          name_en?: string | null
          name_fr: string
          slug: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          icon?: string | null
          id?: string
          is_active?: boolean
          name_ar?: string | null
          name_en?: string | null
          name_fr?: string
          slug?: string
          sort_order?: number
        }
        Relationships: []
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
      claim_requests: {
        Row: {
          business_document_url: string | null
          business_registration: string | null
          claimant_id: string
          created_at: string
          full_name: string | null
          id: string
          identity_document_url: string | null
          license_document_url: string | null
          notes: string | null
          professional_license: string | null
          provider_id: string
          review_notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          updated_at: string
        }
        Insert: {
          business_document_url?: string | null
          business_registration?: string | null
          claimant_id: string
          created_at?: string
          full_name?: string | null
          id?: string
          identity_document_url?: string | null
          license_document_url?: string | null
          notes?: string | null
          professional_license?: string | null
          provider_id: string
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          business_document_url?: string | null
          business_registration?: string | null
          claimant_id?: string
          created_at?: string
          full_name?: string | null
          id?: string
          identity_document_url?: string | null
          license_document_url?: string | null
          notes?: string | null
          professional_license?: string | null
          provider_id?: string
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "claim_requests_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "providers"
            referencedColumns: ["id"]
          },
        ]
      }
      consultation_types: {
        Row: {
          created_at: string
          default_duration_minutes: number | null
          icon: string | null
          id: string
          is_active: boolean
          name_ar: string | null
          name_en: string | null
          name_fr: string
          slug: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          default_duration_minutes?: number | null
          icon?: string | null
          id?: string
          is_active?: boolean
          name_ar?: string | null
          name_en?: string | null
          name_fr: string
          slug: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          default_duration_minutes?: number | null
          icon?: string | null
          id?: string
          is_active?: boolean
          name_ar?: string | null
          name_en?: string | null
          name_fr?: string
          slug?: string
          sort_order?: number
        }
        Relationships: []
      }
      countries: {
        Row: {
          created_at: string
          currency_code: string | null
          id: string
          is_active: boolean
          iso2: string
          iso3: string | null
          name_ar: string | null
          name_en: string | null
          name_fr: string
          phone_code: string | null
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          currency_code?: string | null
          id?: string
          is_active?: boolean
          iso2: string
          iso3?: string | null
          name_ar?: string | null
          name_en?: string | null
          name_fr: string
          phone_code?: string | null
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          currency_code?: string | null
          id?: string
          is_active?: boolean
          iso2?: string
          iso3?: string | null
          name_ar?: string | null
          name_en?: string | null
          name_fr?: string
          phone_code?: string | null
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
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
      edit_requests: {
        Row: {
          created_at: string
          current_value: string | null
          entity_id: string
          entity_type: string
          field: string | null
          id: string
          proposed_value: string | null
          reason: string | null
          review_notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          submitted_by: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          current_value?: string | null
          entity_id: string
          entity_type: string
          field?: string | null
          id?: string
          proposed_value?: string | null
          reason?: string | null
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          submitted_by?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          current_value?: string | null
          entity_id?: string
          entity_type?: string
          field?: string | null
          id?: string
          proposed_value?: string | null
          reason?: string | null
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          submitted_by?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      emergency_categories: {
        Row: {
          color: string | null
          created_at: string
          icon: string | null
          id: string
          is_active: boolean
          name_ar: string | null
          name_en: string | null
          name_fr: string
          phone_number: string | null
          slug: string
          sort_order: number
        }
        Insert: {
          color?: string | null
          created_at?: string
          icon?: string | null
          id?: string
          is_active?: boolean
          name_ar?: string | null
          name_en?: string | null
          name_fr: string
          phone_number?: string | null
          slug: string
          sort_order?: number
        }
        Update: {
          color?: string | null
          created_at?: string
          icon?: string | null
          id?: string
          is_active?: boolean
          name_ar?: string | null
          name_en?: string | null
          name_fr?: string
          phone_number?: string | null
          slug?: string
          sort_order?: number
        }
        Relationships: []
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
      error_reports: {
        Row: {
          context: Json
          created_at: string
          fingerprint: string
          first_seen: string
          id: string
          last_seen: string
          message: string
          occurrences: number
          resolved: boolean
          resolved_at: string | null
          severity: string
          source: string
          stack: string | null
          url: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          context?: Json
          created_at?: string
          fingerprint: string
          first_seen?: string
          id?: string
          last_seen?: string
          message: string
          occurrences?: number
          resolved?: boolean
          resolved_at?: string | null
          severity?: string
          source?: string
          stack?: string | null
          url?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          context?: Json
          created_at?: string
          fingerprint?: string
          first_seen?: string
          id?: string
          last_seen?: string
          message?: string
          occurrences?: number
          resolved?: boolean
          resolved_at?: string | null
          severity?: string
          source?: string
          stack?: string | null
          url?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      facility_categories: {
        Row: {
          created_at: string
          icon: string | null
          id: string
          is_active: boolean
          name_ar: string | null
          name_en: string | null
          name_fr: string
          slug: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          icon?: string | null
          id?: string
          is_active?: boolean
          name_ar?: string | null
          name_en?: string | null
          name_fr: string
          slug: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          icon?: string | null
          id?: string
          is_active?: boolean
          name_ar?: string | null
          name_en?: string | null
          name_fr?: string
          slug?: string
          sort_order?: number
        }
        Relationships: []
      }
      faqs: {
        Row: {
          answer: string
          category: string | null
          created_at: string
          id: string
          is_published: boolean
          language: Database["public"]["Enums"]["article_language"]
          question: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          answer: string
          category?: string | null
          created_at?: string
          id?: string
          is_published?: boolean
          language?: Database["public"]["Enums"]["article_language"]
          question: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          answer?: string
          category?: string | null
          created_at?: string
          id?: string
          is_published?: boolean
          language?: Database["public"]["Enums"]["article_language"]
          question?: string
          sort_order?: number
          updated_at?: string
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
      feature_flags: {
        Row: {
          created_at: string
          description: string | null
          enabled: boolean
          environment: string
          key: string
          rollout_percent: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          enabled?: boolean
          environment?: string
          key: string
          rollout_percent?: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          enabled?: boolean
          environment?: string
          key?: string
          rollout_percent?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      fraud_signals: {
        Row: {
          created_at: string
          details: Json
          id: string
          resolved: boolean
          signal_type: string
          target_id: string | null
          target_type: string
          weight: number
        }
        Insert: {
          created_at?: string
          details?: Json
          id?: string
          resolved?: boolean
          signal_type: string
          target_id?: string | null
          target_type: string
          weight?: number
        }
        Update: {
          created_at?: string
          details?: Json
          id?: string
          resolved?: boolean
          signal_type?: string
          target_id?: string | null
          target_type?: string
          weight?: number
        }
        Relationships: []
      }
      hospital_departments_catalog: {
        Row: {
          created_at: string
          icon: string | null
          id: string
          is_active: boolean
          name_ar: string | null
          name_en: string | null
          name_fr: string
          slug: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          icon?: string | null
          id?: string
          is_active?: boolean
          name_ar?: string | null
          name_en?: string | null
          name_fr: string
          slug: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          icon?: string | null
          id?: string
          is_active?: boolean
          name_ar?: string | null
          name_en?: string | null
          name_fr?: string
          slug?: string
          sort_order?: number
        }
        Relationships: []
      }
      import_errors: {
        Row: {
          created_at: string
          field: string | null
          id: string
          job_id: string
          message: string
          payload: Json | null
          row_number: number | null
          severity: string
        }
        Insert: {
          created_at?: string
          field?: string | null
          id?: string
          job_id: string
          message: string
          payload?: Json | null
          row_number?: number | null
          severity?: string
        }
        Update: {
          created_at?: string
          field?: string | null
          id?: string
          job_id?: string
          message?: string
          payload?: Json | null
          row_number?: number | null
          severity?: string
        }
        Relationships: [
          {
            foreignKeyName: "import_errors_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "import_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      import_jobs: {
        Row: {
          created_at: string
          created_by: string | null
          dataset: string
          duplicate_count: number
          duration_ms: number | null
          finished_at: string | null
          id: string
          inserted_count: number
          mapping: Json
          options: Json
          rejected_count: number
          report: Json
          source_filename: string | null
          source_format: string | null
          source_storage_path: string | null
          started_at: string | null
          status: string
          total_rows: number
          updated_at: string
          updated_count: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          dataset: string
          duplicate_count?: number
          duration_ms?: number | null
          finished_at?: string | null
          id?: string
          inserted_count?: number
          mapping?: Json
          options?: Json
          rejected_count?: number
          report?: Json
          source_filename?: string | null
          source_format?: string | null
          source_storage_path?: string | null
          started_at?: string | null
          status?: string
          total_rows?: number
          updated_at?: string
          updated_count?: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          dataset?: string
          duplicate_count?: number
          duration_ms?: number | null
          finished_at?: string | null
          id?: string
          inserted_count?: number
          mapping?: Json
          options?: Json
          rejected_count?: number
          report?: Json
          source_filename?: string | null
          source_format?: string | null
          source_storage_path?: string | null
          started_at?: string | null
          status?: string
          total_rows?: number
          updated_at?: string
          updated_count?: number
        }
        Relationships: []
      }
      import_mappings: {
        Row: {
          created_at: string
          created_by: string | null
          dataset: string
          id: string
          is_shared: boolean
          mapping: Json
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          dataset: string
          id?: string
          is_shared?: boolean
          mapping?: Json
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          dataset?: string
          id?: string
          is_shared?: boolean
          mapping?: Json
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      insurance_companies: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          logo_url: string | null
          name_ar: string | null
          name_en: string | null
          name_fr: string
          phone: string | null
          short_code: string | null
          slug: string
          sort_order: number
          updated_at: string
          website: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          logo_url?: string | null
          name_ar?: string | null
          name_en?: string | null
          name_fr: string
          phone?: string | null
          short_code?: string | null
          slug: string
          sort_order?: number
          updated_at?: string
          website?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          logo_url?: string | null
          name_ar?: string | null
          name_en?: string | null
          name_fr?: string
          phone?: string | null
          short_code?: string | null
          slug?: string
          sort_order?: number
          updated_at?: string
          website?: string | null
        }
        Relationships: []
      }
      laboratory_categories: {
        Row: {
          created_at: string
          icon: string | null
          id: string
          is_active: boolean
          name_ar: string | null
          name_en: string | null
          name_fr: string
          slug: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          icon?: string | null
          id?: string
          is_active?: boolean
          name_ar?: string | null
          name_en?: string | null
          name_fr: string
          slug: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          icon?: string | null
          id?: string
          is_active?: boolean
          name_ar?: string | null
          name_en?: string | null
          name_fr?: string
          slug?: string
          sort_order?: number
        }
        Relationships: []
      }
      languages: {
        Row: {
          code: string
          created_at: string
          id: string
          is_active: boolean
          is_rtl: boolean
          name_ar: string | null
          name_en: string | null
          name_fr: string
          native_name: string | null
          sort_order: number
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          is_active?: boolean
          is_rtl?: boolean
          name_ar?: string | null
          name_en?: string | null
          name_fr: string
          native_name?: string | null
          sort_order?: number
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          is_active?: boolean
          is_rtl?: boolean
          name_ar?: string | null
          name_en?: string | null
          name_fr?: string
          native_name?: string | null
          sort_order?: number
        }
        Relationships: []
      }
      launch_checklist_items: {
        Row: {
          category: string
          completed_at: string | null
          created_at: string
          description: string | null
          id: string
          notes: string | null
          owner: string | null
          priority: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          category: string
          completed_at?: string | null
          created_at?: string
          description?: string | null
          id?: string
          notes?: string | null
          owner?: string | null
          priority?: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          category?: string
          completed_at?: string | null
          created_at?: string
          description?: string | null
          id?: string
          notes?: string | null
          owner?: string | null
          priority?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      login_attempts: {
        Row: {
          created_at: string
          email: string | null
          failure_reason: string | null
          id: string
          ip_address: unknown
          success: boolean
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          email?: string | null
          failure_reason?: string | null
          id?: string
          ip_address?: unknown
          success?: boolean
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          email?: string | null
          failure_reason?: string | null
          id?: string
          ip_address?: unknown
          success?: boolean
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      mdm_quality_scores: {
        Row: {
          computed_at: string
          entity_id: string
          entity_type: string
          id: string
          score: number
          signals: Json
        }
        Insert: {
          computed_at?: string
          entity_id: string
          entity_type: string
          id?: string
          score?: number
          signals?: Json
        }
        Update: {
          computed_at?: string
          entity_id?: string
          entity_type?: string
          id?: string
          score?: number
          signals?: Json
        }
        Relationships: []
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
      medical_equipment: {
        Row: {
          category: string | null
          created_at: string
          id: string
          is_active: boolean
          name_ar: string | null
          name_en: string | null
          name_fr: string
          slug: string
          sort_order: number
        }
        Insert: {
          category?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          name_ar?: string | null
          name_en?: string | null
          name_fr: string
          slug: string
          sort_order?: number
        }
        Update: {
          category?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          name_ar?: string | null
          name_en?: string | null
          name_fr?: string
          slug?: string
          sort_order?: number
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
      medical_services_catalog: {
        Row: {
          category: string | null
          created_at: string
          description: string | null
          icon: string | null
          id: string
          is_active: boolean
          name_ar: string | null
          name_en: string | null
          name_fr: string
          slug: string
          sort_order: number
        }
        Insert: {
          category?: string | null
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean
          name_ar?: string | null
          name_en?: string | null
          name_fr: string
          slug: string
          sort_order?: number
        }
        Update: {
          category?: string | null
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean
          name_ar?: string | null
          name_en?: string | null
          name_fr?: string
          slug?: string
          sort_order?: number
        }
        Relationships: []
      }
      notification_categories: {
        Row: {
          created_at: string
          icon: string | null
          id: string
          is_active: boolean
          name_ar: string | null
          name_en: string | null
          name_fr: string
          slug: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          icon?: string | null
          id?: string
          is_active?: boolean
          name_ar?: string | null
          name_en?: string | null
          name_fr: string
          slug: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          icon?: string | null
          id?: string
          is_active?: boolean
          name_ar?: string | null
          name_en?: string | null
          name_fr?: string
          slug?: string
          sort_order?: number
        }
        Relationships: []
      }
      notification_events: {
        Row: {
          created_at: string
          event_type: string
          id: string
          metadata: Json | null
          notification_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          event_type: string
          id?: string
          metadata?: Json | null
          notification_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          metadata?: Json | null
          notification_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_events_notification_id_fkey"
            columns: ["notification_id"]
            isOneToOne: false
            referencedRelation: "notifications"
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
          action_label: string | null
          action_url: string | null
          body: string | null
          channel: string
          clicked_at: string | null
          created_at: string
          data: Json
          dedupe_key: string | null
          delivery_attempts: number
          expires_at: string | null
          id: string
          is_archived: boolean
          is_pinned: boolean
          is_read: boolean
          last_attempt_at: string | null
          latitude: number | null
          longitude: number | null
          opened_at: string | null
          priority: Database["public"]["Enums"]["notification_priority"]
          read_at: string | null
          scheduled_for: string | null
          status: Database["public"]["Enums"]["notification_status"]
          title: string
          type: Database["public"]["Enums"]["notification_type"]
          user_id: string
        }
        Insert: {
          action_label?: string | null
          action_url?: string | null
          body?: string | null
          channel?: string
          clicked_at?: string | null
          created_at?: string
          data?: Json
          dedupe_key?: string | null
          delivery_attempts?: number
          expires_at?: string | null
          id?: string
          is_archived?: boolean
          is_pinned?: boolean
          is_read?: boolean
          last_attempt_at?: string | null
          latitude?: number | null
          longitude?: number | null
          opened_at?: string | null
          priority?: Database["public"]["Enums"]["notification_priority"]
          read_at?: string | null
          scheduled_for?: string | null
          status?: Database["public"]["Enums"]["notification_status"]
          title: string
          type?: Database["public"]["Enums"]["notification_type"]
          user_id: string
        }
        Update: {
          action_label?: string | null
          action_url?: string | null
          body?: string | null
          channel?: string
          clicked_at?: string | null
          created_at?: string
          data?: Json
          dedupe_key?: string | null
          delivery_attempts?: number
          expires_at?: string | null
          id?: string
          is_archived?: boolean
          is_pinned?: boolean
          is_read?: boolean
          last_attempt_at?: string | null
          latitude?: number | null
          longitude?: number | null
          opened_at?: string | null
          priority?: Database["public"]["Enums"]["notification_priority"]
          read_at?: string | null
          scheduled_for?: string | null
          status?: Database["public"]["Enums"]["notification_status"]
          title?: string
          type?: Database["public"]["Enums"]["notification_type"]
          user_id?: string
        }
        Relationships: []
      }
      permissions: {
        Row: {
          category: string | null
          code: string
          created_at: string
          description: string | null
          id: string
          name_fr: string
        }
        Insert: {
          category?: string | null
          code: string
          created_at?: string
          description?: string | null
          id?: string
          name_fr: string
        }
        Update: {
          category?: string | null
          code?: string
          created_at?: string
          description?: string | null
          id?: string
          name_fr?: string
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
      pharmacy_categories: {
        Row: {
          created_at: string
          icon: string | null
          id: string
          is_active: boolean
          name_ar: string | null
          name_en: string | null
          name_fr: string
          slug: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          icon?: string | null
          id?: string
          is_active?: boolean
          name_ar?: string | null
          name_en?: string | null
          name_fr: string
          slug: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          icon?: string | null
          id?: string
          is_active?: boolean
          name_ar?: string | null
          name_en?: string | null
          name_fr?: string
          slug?: string
          sort_order?: number
        }
        Relationships: []
      }
      postal_codes: {
        Row: {
          city_id: string | null
          code: string
          created_at: string
          district_id: string | null
          id: string
        }
        Insert: {
          city_id?: string | null
          code: string
          created_at?: string
          district_id?: string | null
          id?: string
        }
        Update: {
          city_id?: string | null
          code?: string
          created_at?: string
          district_id?: string | null
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "postal_codes_city_id_fkey"
            columns: ["city_id"]
            isOneToOne: false
            referencedRelation: "cities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "postal_codes_district_id_fkey"
            columns: ["district_id"]
            isOneToOne: false
            referencedRelation: "districts"
            referencedColumns: ["id"]
          },
        ]
      }
      prefectures: {
        Row: {
          code: string | null
          created_at: string
          id: string
          name_ar: string | null
          name_fr: string
          region_id: string | null
        }
        Insert: {
          code?: string | null
          created_at?: string
          id?: string
          name_ar?: string | null
          name_fr: string
          region_id?: string | null
        }
        Update: {
          code?: string | null
          created_at?: string
          id?: string
          name_ar?: string | null
          name_fr?: string
          region_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "prefectures_region_id_fkey"
            columns: ["region_id"]
            isOneToOne: false
            referencedRelation: "regions"
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
      provider_insurance: {
        Row: {
          created_at: string
          insurance_id: string
          notes: string | null
          provider_id: string
        }
        Insert: {
          created_at?: string
          insurance_id: string
          notes?: string | null
          provider_id: string
        }
        Update: {
          created_at?: string
          insurance_id?: string
          notes?: string | null
          provider_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "provider_insurance_insurance_id_fkey"
            columns: ["insurance_id"]
            isOneToOne: false
            referencedRelation: "insurance_companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "provider_insurance_provider_id_fkey"
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
      provider_trust_scores: {
        Row: {
          computed_at: string
          factors: Json
          level: string
          provider_id: string
          score: number
        }
        Insert: {
          computed_at?: string
          factors?: Json
          level?: string
          provider_id: string
          score?: number
        }
        Update: {
          computed_at?: string
          factors?: Json
          level?: string
          provider_id?: string
          score?: number
        }
        Relationships: [
          {
            foreignKeyName: "provider_trust_scores_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: true
            referencedRelation: "providers"
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
          suspended_at: string | null
          suspension_reason: string | null
          updated_at: string
          verification_notes: string | null
          verification_status: Database["public"]["Enums"]["verification_status"]
          verified_at: string | null
          verified_by: string | null
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
          suspended_at?: string | null
          suspension_reason?: string | null
          updated_at?: string
          verification_notes?: string | null
          verification_status?: Database["public"]["Enums"]["verification_status"]
          verified_at?: string | null
          verified_by?: string | null
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
          suspended_at?: string | null
          suspension_reason?: string | null
          updated_at?: string
          verification_notes?: string | null
          verification_status?: Database["public"]["Enums"]["verification_status"]
          verified_at?: string | null
          verified_by?: string | null
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
      push_subscriptions: {
        Row: {
          auth_key: string
          created_at: string
          enabled: boolean
          endpoint: string
          id: string
          last_used_at: string | null
          p256dh: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          auth_key: string
          created_at?: string
          enabled?: boolean
          endpoint: string
          id?: string
          last_used_at?: string | null
          p256dh: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          auth_key?: string
          created_at?: string
          enabled?: boolean
          endpoint?: string
          id?: string
          last_used_at?: string | null
          p256dh?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      rate_limit_buckets: {
        Row: {
          bucket_key: string
          count: number
          window_start: string
        }
        Insert: {
          bucket_key: string
          count?: number
          window_start: string
        }
        Update: {
          bucket_key?: string
          count?: number
          window_start?: string
        }
        Relationships: []
      }
      record_versions: {
        Row: {
          change_reason: string | null
          changed_by: string | null
          created_at: string
          entity_id: string
          entity_type: string
          id: string
          new_value: Json | null
          old_value: Json | null
          version: number
        }
        Insert: {
          change_reason?: string | null
          changed_by?: string | null
          created_at?: string
          entity_id: string
          entity_type: string
          id?: string
          new_value?: Json | null
          old_value?: Json | null
          version?: number
        }
        Update: {
          change_reason?: string | null
          changed_by?: string | null
          created_at?: string
          entity_id?: string
          entity_type?: string
          id?: string
          new_value?: Json | null
          old_value?: Json | null
          version?: number
        }
        Relationships: []
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
      reports: {
        Row: {
          category: string
          created_at: string
          id: string
          reason: string
          reporter_id: string | null
          resolved_at: string | null
          resolver_id: string | null
          resolver_notes: string | null
          status: string
          target_id: string | null
          target_type: string
          updated_at: string
        }
        Insert: {
          category?: string
          created_at?: string
          id?: string
          reason: string
          reporter_id?: string | null
          resolved_at?: string | null
          resolver_id?: string | null
          resolver_notes?: string | null
          status?: string
          target_id?: string | null
          target_type: string
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          id?: string
          reason?: string
          reporter_id?: string | null
          resolved_at?: string | null
          resolver_id?: string | null
          resolver_notes?: string | null
          status?: string
          target_id?: string | null
          target_type?: string
          updated_at?: string
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
      role_permissions: {
        Row: {
          created_at: string
          permission_id: string
          role: Database["public"]["Enums"]["app_role"]
        }
        Insert: {
          created_at?: string
          permission_id: string
          role: Database["public"]["Enums"]["app_role"]
        }
        Update: {
          created_at?: string
          permission_id?: string
          role?: Database["public"]["Enums"]["app_role"]
        }
        Relationships: [
          {
            foreignKeyName: "role_permissions_permission_id_fkey"
            columns: ["permission_id"]
            isOneToOne: false
            referencedRelation: "permissions"
            referencedColumns: ["id"]
          },
        ]
      }
      security_events: {
        Row: {
          city: string | null
          country: string | null
          created_at: string
          event_type: string
          id: string
          ip_address: unknown
          metadata: Json
          resolved: boolean
          resolved_at: string | null
          resolved_by: string | null
          severity: string
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          city?: string | null
          country?: string | null
          created_at?: string
          event_type: string
          id?: string
          ip_address?: unknown
          metadata?: Json
          resolved?: boolean
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          city?: string | null
          country?: string | null
          created_at?: string
          event_type?: string
          id?: string
          ip_address?: unknown
          metadata?: Json
          resolved?: boolean
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
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
      sub_specialties: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          name_ar: string | null
          name_en: string | null
          name_fr: string
          slug: string
          sort_order: number
          specialty_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          name_ar?: string | null
          name_en?: string | null
          name_fr: string
          slug: string
          sort_order?: number
          specialty_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          name_ar?: string | null
          name_en?: string | null
          name_fr?: string
          slug?: string
          sort_order?: number
          specialty_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sub_specialties_specialty_id_fkey"
            columns: ["specialty_id"]
            isOneToOne: false
            referencedRelation: "specialties"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_plans: {
        Row: {
          billing_cycle: string
          created_at: string
          features: Json
          id: string
          is_active: boolean
          name_ar: string | null
          name_en: string | null
          name_fr: string
          price_mad: number
          slug: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          billing_cycle?: string
          created_at?: string
          features?: Json
          id?: string
          is_active?: boolean
          name_ar?: string | null
          name_en?: string | null
          name_fr: string
          price_mad?: number
          slug: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          billing_cycle?: string
          created_at?: string
          features?: Json
          id?: string
          is_active?: boolean
          name_ar?: string | null
          name_en?: string | null
          name_fr?: string
          price_mad?: number
          slug?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      system_health_checks: {
        Row: {
          checked_at: string
          component: string
          details: Json | null
          id: number
          latency_ms: number | null
          status: string
        }
        Insert: {
          checked_at?: string
          component: string
          details?: Json | null
          id?: number
          latency_ms?: number | null
          status: string
        }
        Update: {
          checked_at?: string
          component?: string
          details?: Json | null
          id?: number
          latency_ms?: number | null
          status?: string
        }
        Relationships: []
      }
      user_devices: {
        Row: {
          created_at: string
          device_name: string | null
          fingerprint: string
          id: string
          ip_address: unknown
          last_seen_at: string
          trusted: boolean
          user_agent: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          device_name?: string | null
          fingerprint: string
          id?: string
          ip_address?: unknown
          last_seen_at?: string
          trusted?: boolean
          user_agent?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          device_name?: string | null
          fingerprint?: string
          id?: string
          ip_address?: unknown
          last_seen_at?: string
          trusted?: boolean
          user_agent?: string | null
          user_id?: string
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
      check_brute_force: {
        Args: {
          _email: string
          _ip: unknown
          _max_attempts?: number
          _window_minutes?: number
        }
        Returns: boolean
      }
      check_notification_rate_limit: {
        Args: {
          _max_count?: number
          _type: Database["public"]["Enums"]["notification_type"]
          _user_id: string
          _window_minutes?: number
        }
        Returns: boolean
      }
      compute_provider_trust: { Args: { _provider: string }; Returns: number }
      detect_duplicate_providers: {
        Args: { _provider: string }
        Returns: {
          duplicate_id: string
          reason: string
          similarity: number
        }[]
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
      has_any_admin_role: { Args: { _user_id: string }; Returns: boolean }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_blocked: { Args: { _kind: string; _value: string }; Returns: boolean }
      log_security_event: {
        Args: { _meta?: Json; _severity: string; _type: string; _user: string }
        Returns: string
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
      article_status: "draft" | "published" | "scheduled" | "archived"
      blood_group: "A+" | "A-" | "B+" | "B-" | "AB+" | "AB-" | "O+" | "O-"
      blood_request_status: "open" | "fulfilled" | "expired" | "cancelled"
      blood_request_urgency: "low" | "normal" | "high" | "critical"
      blood_response_status: "pending" | "accepted" | "declined" | "cancelled"
      content_type:
        | "article"
        | "news"
        | "campaign"
        | "faq"
        | "guide"
        | "emergency"
        | "seasonal"
        | "announcement"
        | "city_info"
      donor_status:
        | "available"
        | "unavailable"
        | "busy"
        | "traveling"
        | "inactive"
      notification_priority: "low" | "normal" | "high" | "urgent" | "critical"
      notification_status:
        | "pending"
        | "sent"
        | "delivered"
        | "opened"
        | "clicked"
        | "failed"
        | "ignored"
      notification_type:
        | "push"
        | "email"
        | "blood_request"
        | "appointment"
        | "emergency"
        | "medical_tip"
        | "system"
        | "pharmacy_on_duty"
        | "campaign"
        | "article"
        | "doctor_availability"
        | "lab_results"
        | "ai_suggestion"
      provider_category:
        | "doctor"
        | "dentist"
        | "pharmacy"
        | "laboratory"
        | "clinic"
        | "hospital"
        | "blood_center"
      verification_status:
        | "pending"
        | "under_review"
        | "verified"
        | "official_verified"
        | "rejected"
        | "suspended"
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
      article_status: ["draft", "published", "scheduled", "archived"],
      blood_group: ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"],
      blood_request_status: ["open", "fulfilled", "expired", "cancelled"],
      blood_request_urgency: ["low", "normal", "high", "critical"],
      blood_response_status: ["pending", "accepted", "declined", "cancelled"],
      content_type: [
        "article",
        "news",
        "campaign",
        "faq",
        "guide",
        "emergency",
        "seasonal",
        "announcement",
        "city_info",
      ],
      donor_status: [
        "available",
        "unavailable",
        "busy",
        "traveling",
        "inactive",
      ],
      notification_priority: ["low", "normal", "high", "urgent", "critical"],
      notification_status: [
        "pending",
        "sent",
        "delivered",
        "opened",
        "clicked",
        "failed",
        "ignored",
      ],
      notification_type: [
        "push",
        "email",
        "blood_request",
        "appointment",
        "emergency",
        "medical_tip",
        "system",
        "pharmacy_on_duty",
        "campaign",
        "article",
        "doctor_availability",
        "lab_results",
        "ai_suggestion",
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
      verification_status: [
        "pending",
        "under_review",
        "verified",
        "official_verified",
        "rejected",
        "suspended",
      ],
    },
  },
} as const
