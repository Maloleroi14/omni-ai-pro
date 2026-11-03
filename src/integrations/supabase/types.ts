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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      active_user_sessions: {
        Row: {
          current_page: string | null
          id: string
          is_active: boolean | null
          last_activity_at: string | null
          started_at: string | null
          user_agent: string | null
          user_email: string | null
          user_id: string
        }
        Insert: {
          current_page?: string | null
          id?: string
          is_active?: boolean | null
          last_activity_at?: string | null
          started_at?: string | null
          user_agent?: string | null
          user_email?: string | null
          user_id: string
        }
        Update: {
          current_page?: string | null
          id?: string
          is_active?: boolean | null
          last_activity_at?: string | null
          started_at?: string | null
          user_agent?: string | null
          user_email?: string | null
          user_id?: string
        }
        Relationships: []
      }
      ad_revenue: {
        Row: {
          created_at: string
          date: string
          id: string
          impressions: number
          network: string
          notes: string | null
          revenue: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          date?: string
          id?: string
          impressions?: number
          network?: string
          notes?: string | null
          revenue?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          date?: string
          id?: string
          impressions?: number
          network?: string
          notes?: string | null
          revenue?: number
          updated_at?: string
        }
        Relationships: []
      }
      admin_notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          message: string
          metadata: Json
          title: string
          type: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          message: string
          metadata?: Json
          title: string
          type: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string
          metadata?: Json
          title?: string
          type?: string
        }
        Relationships: []
      }
      admin_settings: {
        Row: {
          id: string
          setting_key: string
          setting_value: Json
          updated_at: string
        }
        Insert: {
          id?: string
          setting_key: string
          setting_value?: Json
          updated_at?: string
        }
        Update: {
          id?: string
          setting_key?: string
          setting_value?: Json
          updated_at?: string
        }
        Relationships: []
      }
      admin_user_notes: {
        Row: {
          admin_email: string
          admin_id: string
          created_at: string
          id: string
          note: string
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_email: string
          admin_id: string
          created_at?: string
          id?: string
          note: string
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_email?: string
          admin_id?: string
          created_at?: string
          id?: string
          note?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      announcements: {
        Row: {
          content: string
          created_at: string
          created_by: string
          dismissed_by: string[] | null
          expires_at: string | null
          id: string
          is_active: boolean
          priority: string
          scheduled_at: string | null
          target: string
          target_emails: string[] | null
          title: string
          type: string
        }
        Insert: {
          content: string
          created_at?: string
          created_by: string
          dismissed_by?: string[] | null
          expires_at?: string | null
          id?: string
          is_active?: boolean
          priority?: string
          scheduled_at?: string | null
          target?: string
          target_emails?: string[] | null
          title: string
          type?: string
        }
        Update: {
          content?: string
          created_at?: string
          created_by?: string
          dismissed_by?: string[] | null
          expires_at?: string | null
          id?: string
          is_active?: boolean
          priority?: string
          scheduled_at?: string | null
          target?: string
          target_emails?: string[] | null
          title?: string
          type?: string
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          action_details: Json
          action_type: string
          admin_email: string
          admin_user_id: string
          created_at: string
          id: string
          target_email: string | null
          target_user_id: string | null
        }
        Insert: {
          action_details?: Json
          action_type: string
          admin_email: string
          admin_user_id: string
          created_at?: string
          id?: string
          target_email?: string | null
          target_user_id?: string | null
        }
        Update: {
          action_details?: Json
          action_type?: string
          admin_email?: string
          admin_user_id?: string
          created_at?: string
          id?: string
          target_email?: string | null
          target_user_id?: string | null
        }
        Relationships: []
      }
      banned_user_backups: {
        Row: {
          backup_data: Json
          created_at: string | null
          display_name: string | null
          email: string
          id: string
          original_user_id: string
        }
        Insert: {
          backup_data?: Json
          created_at?: string | null
          display_name?: string | null
          email: string
          id?: string
          original_user_id: string
        }
        Update: {
          backup_data?: Json
          created_at?: string | null
          display_name?: string | null
          email?: string
          id?: string
          original_user_id?: string
        }
        Relationships: []
      }
      banned_users: {
        Row: {
          ban_message: string | null
          ban_type: string | null
          banned_at: string
          banned_by: string
          id: string
          message_read: boolean | null
          message_read_at: string | null
          permanent: boolean | null
          reason: string | null
          user_id: string
        }
        Insert: {
          ban_message?: string | null
          ban_type?: string | null
          banned_at?: string
          banned_by: string
          id?: string
          message_read?: boolean | null
          message_read_at?: string | null
          permanent?: boolean | null
          reason?: string | null
          user_id: string
        }
        Update: {
          ban_message?: string | null
          ban_type?: string | null
          banned_at?: string
          banned_by?: string
          id?: string
          message_read?: boolean | null
          message_read_at?: string | null
          permanent?: boolean | null
          reason?: string | null
          user_id?: string
        }
        Relationships: []
      }
      blocked_features: {
        Row: {
          created_at: string
          feature_name: string
          id: string
          is_blocked: boolean
        }
        Insert: {
          created_at?: string
          feature_name: string
          id?: string
          is_blocked?: boolean
        }
        Update: {
          created_at?: string
          feature_name?: string
          id?: string
          is_blocked?: boolean
        }
        Relationships: []
      }
      blocked_sites: {
        Row: {
          blocked_by: string
          created_at: string
          domain: string
          id: string
          reason: string | null
        }
        Insert: {
          blocked_by: string
          created_at?: string
          domain: string
          id?: string
          reason?: string | null
        }
        Update: {
          blocked_by?: string
          created_at?: string
          domain?: string
          id?: string
          reason?: string | null
        }
        Relationships: []
      }
      blocked_words: {
        Row: {
          added_by: string
          added_by_email: string
          created_at: string
          id: string
          severity: string
          word: string
        }
        Insert: {
          added_by: string
          added_by_email: string
          created_at?: string
          id?: string
          severity?: string
          word: string
        }
        Update: {
          added_by?: string
          added_by_email?: string
          created_at?: string
          id?: string
          severity?: string
          word?: string
        }
        Relationships: []
      }
      browser_history: {
        Row: {
          id: string
          title: string | null
          url: string
          user_email: string | null
          user_id: string
          visited_at: string
        }
        Insert: {
          id?: string
          title?: string | null
          url: string
          user_email?: string | null
          user_id: string
          visited_at?: string
        }
        Update: {
          id?: string
          title?: string | null
          url?: string
          user_email?: string | null
          user_id?: string
          visited_at?: string
        }
        Relationships: []
      }
      calculator_unlocks: {
        Row: {
          device_id: string
          id: string
          unlocked_at: string
        }
        Insert: {
          device_id: string
          id?: string
          unlocked_at?: string
        }
        Update: {
          device_id?: string
          id?: string
          unlocked_at?: string
        }
        Relationships: []
      }
      changelog_entries: {
        Row: {
          created_at: string
          description: string
          id: string
          is_published: boolean
          release_date: string
          title: string
          type: string
          updated_at: string
          version: string
        }
        Insert: {
          created_at?: string
          description: string
          id?: string
          is_published?: boolean
          release_date?: string
          title: string
          type?: string
          updated_at?: string
          version: string
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          is_published?: boolean
          release_date?: string
          title?: string
          type?: string
          updated_at?: string
          version?: string
        }
        Relationships: []
      }
      connection_logs: {
        Row: {
          device_type: string | null
          id: string
          ip_address: string | null
          logged_in_at: string
          user_agent: string | null
          user_email: string | null
          user_id: string
        }
        Insert: {
          device_type?: string | null
          id?: string
          ip_address?: string | null
          logged_in_at?: string
          user_agent?: string | null
          user_email?: string | null
          user_id: string
        }
        Update: {
          device_type?: string | null
          id?: string
          ip_address?: string | null
          logged_in_at?: string
          user_agent?: string | null
          user_email?: string | null
          user_id?: string
        }
        Relationships: []
      }
      contact_submissions: {
        Row: {
          created_at: string
          email: string
          id: string
          message: string
          name: string
          status: string
          subject: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          message: string
          name: string
          status?: string
          subject: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          message?: string
          name?: string
          status?: string
          subject?: string
        }
        Relationships: []
      }
      conversations: {
        Row: {
          created_at: string
          id: string
          is_global: boolean
          is_pinned: boolean
          title: string
          type: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          is_global?: boolean
          is_pinned?: boolean
          title?: string
          type?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          is_global?: boolean
          is_pinned?: boolean
          title?: string
          type?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      creator_login_tracker: {
        Row: {
          creator_user_id: string
          id: string
          last_login_at: string
          succession_active: boolean
          updated_at: string
        }
        Insert: {
          creator_user_id: string
          id?: string
          last_login_at?: string
          succession_active?: boolean
          updated_at?: string
        }
        Update: {
          creator_user_id?: string
          id?: string
          last_login_at?: string
          succession_active?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      credit_requests: {
        Row: {
          admin_note: string | null
          amount: number
          created_at: string
          id: string
          processed_at: string | null
          processed_by: string | null
          status: string
          total_price: number
          user_email: string
          user_id: string
        }
        Insert: {
          admin_note?: string | null
          amount: number
          created_at?: string
          id?: string
          processed_at?: string | null
          processed_by?: string | null
          status?: string
          total_price: number
          user_email: string
          user_id: string
        }
        Update: {
          admin_note?: string | null
          amount?: number
          created_at?: string
          id?: string
          processed_at?: string | null
          processed_by?: string | null
          status?: string
          total_price?: number
          user_email?: string
          user_id?: string
        }
        Relationships: []
      }
      device_blocks: {
        Row: {
          blocked_at: string
          blocked_until: string
          blocked_word: string
          created_at: string
          device_id: string
          id: string
          unblocked_by_admin: boolean
          user_email: string | null
          user_id: string | null
        }
        Insert: {
          blocked_at?: string
          blocked_until?: string
          blocked_word: string
          created_at?: string
          device_id: string
          id?: string
          unblocked_by_admin?: boolean
          user_email?: string | null
          user_id?: string | null
        }
        Update: {
          blocked_at?: string
          blocked_until?: string
          blocked_word?: string
          created_at?: string
          device_id?: string
          id?: string
          unblocked_by_admin?: boolean
          user_email?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      direct_conversations: {
        Row: {
          created_at: string
          id: string
          updated_at: string
          user1_id: string
          user2_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          updated_at?: string
          user1_id: string
          user2_id: string
        }
        Update: {
          created_at?: string
          id?: string
          updated_at?: string
          user1_id?: string
          user2_id?: string
        }
        Relationships: []
      }
      direct_messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          is_read: boolean
          sender_id: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          is_read?: boolean
          sender_id: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          is_read?: boolean
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "direct_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "direct_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      dm_group_members: {
        Row: {
          added_at: string | null
          group_id: string
          id: string
          role: string | null
          user_id: string
        }
        Insert: {
          added_at?: string | null
          group_id: string
          id?: string
          role?: string | null
          user_id: string
        }
        Update: {
          added_at?: string | null
          group_id?: string
          id?: string
          role?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "dm_group_members_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "dm_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      dm_group_messages: {
        Row: {
          content: string
          created_at: string | null
          group_id: string
          id: string
          sender_id: string
        }
        Insert: {
          content: string
          created_at?: string | null
          group_id: string
          id?: string
          sender_id: string
        }
        Update: {
          content?: string
          created_at?: string | null
          group_id?: string
          id?: string
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "dm_group_messages_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "dm_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      dm_groups: {
        Row: {
          allow_member_invite: boolean | null
          created_at: string | null
          created_by: string
          description: string | null
          id: string
          name: string
          only_admins_can_send: boolean | null
          photo_url: string | null
          updated_at: string | null
        }
        Insert: {
          allow_member_invite?: boolean | null
          created_at?: string | null
          created_by: string
          description?: string | null
          id?: string
          name: string
          only_admins_can_send?: boolean | null
          photo_url?: string | null
          updated_at?: string | null
        }
        Update: {
          allow_member_invite?: boolean | null
          created_at?: string | null
          created_by?: string
          description?: string | null
          id?: string
          name?: string
          only_admins_can_send?: boolean | null
          photo_url?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      email_send_log: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          message_id: string | null
          metadata: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email?: string
          status?: string
          template_name?: string
        }
        Relationships: []
      }
      email_send_state: {
        Row: {
          auth_email_ttl_minutes: number
          batch_size: number
          id: number
          retry_after_until: string | null
          send_delay_ms: number
          transactional_email_ttl_minutes: number
          updated_at: string
        }
        Insert: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Update: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      email_unsubscribe_tokens: {
        Row: {
          created_at: string
          email: string
          id: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          token?: string
          used_at?: string | null
        }
        Relationships: []
      }
      faq_items: {
        Row: {
          answer: string
          category: string
          created_at: string
          id: string
          is_active: boolean
          question: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          answer: string
          category?: string
          created_at?: string
          id?: string
          is_active?: boolean
          question: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          answer?: string
          category?: string
          created_at?: string
          id?: string
          is_active?: boolean
          question?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      forced_maintenance_users: {
        Row: {
          created_at: string
          created_by: string
          email: string
          id: string
          reason: string | null
        }
        Insert: {
          created_at?: string
          created_by: string
          email: string
          id?: string
          reason?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string
          email?: string
          id?: string
          reason?: string | null
        }
        Relationships: []
      }
      learned_capabilities: {
        Row: {
          capability_name: string
          created_at: string
          example_response: string | null
          id: string
          instructions: string
          trigger_pattern: string
          updated_at: string
          usage_count: number
        }
        Insert: {
          capability_name: string
          created_at?: string
          example_response?: string | null
          id?: string
          instructions: string
          trigger_pattern: string
          updated_at?: string
          usage_count?: number
        }
        Update: {
          capability_name?: string
          created_at?: string
          example_response?: string | null
          id?: string
          instructions?: string
          trigger_pattern?: string
          updated_at?: string
          usage_count?: number
        }
        Relationships: []
      }
      message_reactions: {
        Row: {
          created_at: string
          id: string
          message_id: string
          reaction_type: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          message_id: string
          reaction_type: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          message_id?: string
          reaction_type?: string
          user_id?: string | null
        }
        Relationships: []
      }
      messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          image_url: string | null
          role: string
          user_email: string | null
          user_id: string | null
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          image_url?: string | null
          role: string
          user_email?: string | null
          user_id?: string | null
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          image_url?: string | null
          role?: string
          user_email?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      pending_deletions: {
        Row: {
          cancelled_at: string | null
          expires_at: string
          id: string
          is_active: boolean
          recovery_token: string
          requested_at: string
          user_email: string
          user_id: string
        }
        Insert: {
          cancelled_at?: string | null
          expires_at?: string
          id?: string
          is_active?: boolean
          recovery_token?: string
          requested_at?: string
          user_email: string
          user_id: string
        }
        Update: {
          cancelled_at?: string | null
          expires_at?: string
          id?: string
          is_active?: boolean
          recovery_token?: string
          requested_at?: string
          user_email?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          earnhub_accepted: boolean
          email: string
          id: string
          onboarding_completed: boolean
          preferred_language: string
          terms_accepted: boolean
          terms_accepted_at: string | null
          terms_version: number
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          earnhub_accepted?: boolean
          email: string
          id?: string
          onboarding_completed?: boolean
          preferred_language?: string
          terms_accepted?: boolean
          terms_accepted_at?: string | null
          terms_version?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          earnhub_accepted?: boolean
          email?: string
          id?: string
          onboarding_completed?: boolean
          preferred_language?: string
          terms_accepted?: boolean
          terms_accepted_at?: string | null
          terms_version?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      project_collaborators: {
        Row: {
          added_at: string
          id: string
          project_id: string
          user_id: string
        }
        Insert: {
          added_at?: string
          id?: string
          project_id: string
          user_id: string
        }
        Update: {
          added_at?: string
          id?: string
          project_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_collaborators_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "user_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_invitations: {
        Row: {
          created_at: string
          id: string
          invitation_token: string
          invited_by: string
          invited_email: string
          project_id: string
          responded_at: string | null
          status: string
        }
        Insert: {
          created_at?: string
          id?: string
          invitation_token?: string
          invited_by: string
          invited_email: string
          project_id: string
          responded_at?: string | null
          status?: string
        }
        Update: {
          created_at?: string
          id?: string
          invitation_token?: string
          invited_by?: string
          invited_email?: string
          project_id?: string
          responded_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_invitations_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "user_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_visits: {
        Row: {
          duration_seconds: number | null
          id: string
          project_id: string
          visited_at: string
          visitor_ip: string | null
        }
        Insert: {
          duration_seconds?: number | null
          id?: string
          project_id: string
          visited_at?: string
          visitor_ip?: string | null
        }
        Update: {
          duration_seconds?: number | null
          id?: string
          project_id?: string
          visited_at?: string
          visitor_ip?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_visits_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "user_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      proposal_votes: {
        Row: {
          created_at: string
          id: string
          proposal_id: string
          user_id: string
          vote: boolean
        }
        Insert: {
          created_at?: string
          id?: string
          proposal_id: string
          user_id: string
          vote: boolean
        }
        Update: {
          created_at?: string
          id?: string
          proposal_id?: string
          user_id?: string
          vote?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "proposal_votes_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "update_proposals"
            referencedColumns: ["id"]
          },
        ]
      }
      roadmap_items: {
        Row: {
          category: string
          created_at: string
          description: string
          id: string
          is_published: boolean
          sort_order: number
          status: string
          target_date: string | null
          title: string
          updated_at: string
        }
        Insert: {
          category?: string
          created_at?: string
          description: string
          id?: string
          is_published?: boolean
          sort_order?: number
          status?: string
          target_date?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string
          id?: string
          is_published?: boolean
          sort_order?: number
          status?: string
          target_date?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      session_recordings: {
        Row: {
          created_at: string
          ended_at: string | null
          events: Json
          id: string
          is_active: boolean
          page_url: string | null
          session_id: string
          started_at: string
          user_agent: string | null
          user_email: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          ended_at?: string | null
          events?: Json
          id?: string
          is_active?: boolean
          page_url?: string | null
          session_id: string
          started_at?: string
          user_agent?: string | null
          user_email?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          ended_at?: string | null
          events?: Json
          id?: string
          is_active?: boolean
          page_url?: string | null
          session_id?: string
          started_at?: string
          user_agent?: string | null
          user_email?: string | null
          user_id?: string
        }
        Relationships: []
      }
      shared_conversations: {
        Row: {
          conversation_id: string
          created_at: string | null
          expires_at: string | null
          id: string
          is_active: boolean | null
          share_token: string
          shared_by: string
        }
        Insert: {
          conversation_id: string
          created_at?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          share_token?: string
          shared_by: string
        }
        Update: {
          conversation_id?: string
          created_at?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          share_token?: string
          shared_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "shared_conversations_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      site_data: {
        Row: {
          collection: string
          created_at: string
          data: Json
          id: string
          project_id: string
          updated_at: string
        }
        Insert: {
          collection?: string
          created_at?: string
          data?: Json
          id?: string
          project_id: string
          updated_at?: string
        }
        Update: {
          collection?: string
          created_at?: string
          data?: Json
          id?: string
          project_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      site_form_submissions: {
        Row: {
          created_at: string
          data: Json
          form_name: string
          id: string
          project_id: string
        }
        Insert: {
          created_at?: string
          data?: Json
          form_name?: string
          id?: string
          project_id: string
        }
        Update: {
          created_at?: string
          data?: Json
          form_name?: string
          id?: string
          project_id?: string
        }
        Relationships: []
      }
      sticky_notes: {
        Row: {
          color: string
          content: string
          created_at: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          color?: string
          content: string
          created_at?: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          color?: string
          content?: string
          created_at?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      support_tickets: {
        Row: {
          admin_response: string | null
          closed_at: string | null
          created_at: string
          id: string
          message: string
          priority: string
          responded_by: string | null
          status: string
          subject: string
          updated_at: string
          user_email: string
          user_id: string
        }
        Insert: {
          admin_response?: string | null
          closed_at?: string | null
          created_at?: string
          id?: string
          message: string
          priority?: string
          responded_by?: string | null
          status?: string
          subject: string
          updated_at?: string
          user_email: string
          user_id: string
        }
        Update: {
          admin_response?: string | null
          closed_at?: string | null
          created_at?: string
          id?: string
          message?: string
          priority?: string
          responded_by?: string | null
          status?: string
          subject?: string
          updated_at?: string
          user_email?: string
          user_id?: string
        }
        Relationships: []
      }
      suppressed_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          metadata: Json | null
          reason: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          metadata?: Json | null
          reason: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          metadata?: Json | null
          reason?: string
        }
        Relationships: []
      }
      troll_mode: {
        Row: {
          activated_at: string
          activated_by: string
          expires_at: string | null
          id: string
          is_active: boolean
          user_id: string
        }
        Insert: {
          activated_at?: string
          activated_by: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          user_id: string
        }
        Update: {
          activated_at?: string
          activated_by?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          user_id?: string
        }
        Relationships: []
      }
      update_proposals: {
        Row: {
          category: string
          created_at: string
          created_by: string
          description: string
          id: string
          is_published: boolean
          title: string
          updated_at: string
        }
        Insert: {
          category?: string
          created_at?: string
          created_by: string
          description: string
          id?: string
          is_published?: boolean
          title: string
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          created_by?: string
          description?: string
          id?: string
          is_published?: boolean
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_activity_log: {
        Row: {
          action_type: string
          created_at: string
          description: string
          id: string
          metadata: Json | null
          user_id: string
        }
        Insert: {
          action_type: string
          created_at?: string
          description: string
          id?: string
          metadata?: Json | null
          user_id: string
        }
        Update: {
          action_type?: string
          created_at?: string
          description?: string
          id?: string
          metadata?: Json | null
          user_id?: string
        }
        Relationships: []
      }
      user_ads: {
        Row: {
          content: string
          created_at: string
          created_by: string
          id: string
          is_active: boolean
          target_user_id: string | null
          updated_at: string
        }
        Insert: {
          content: string
          created_at?: string
          created_by: string
          id?: string
          is_active?: boolean
          target_user_id?: string | null
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          created_by?: string
          id?: string
          is_active?: boolean
          target_user_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      user_credits: {
        Row: {
          created_at: string
          credits: number
          id: string
          last_reset: string
          user_id: string
        }
        Insert: {
          created_at?: string
          credits?: number
          id?: string
          last_reset?: string
          user_id: string
        }
        Update: {
          created_at?: string
          credits?: number
          id?: string
          last_reset?: string
          user_id?: string
        }
        Relationships: []
      }
      user_favorites: {
        Row: {
          conversation_id: string | null
          created_at: string | null
          id: string
          message_id: string | null
          note: string | null
          user_id: string
        }
        Insert: {
          conversation_id?: string | null
          created_at?: string | null
          id?: string
          message_id?: string | null
          note?: string | null
          user_id: string
        }
        Update: {
          conversation_id?: string | null
          created_at?: string | null
          id?: string
          message_id?: string | null
          note?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_favorites_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      user_followers: {
        Row: {
          created_at: string
          follower_id: string
          following_id: string
          id: string
        }
        Insert: {
          created_at?: string
          follower_id: string
          following_id: string
          id?: string
        }
        Update: {
          created_at?: string
          follower_id?: string
          following_id?: string
          id?: string
        }
        Relationships: []
      }
      user_memories: {
        Row: {
          context: string | null
          created_at: string
          id: string
          importance: number | null
          memory_key: string
          memory_value: string
          updated_at: string
          user_id: string
        }
        Insert: {
          context?: string | null
          created_at?: string
          id?: string
          importance?: number | null
          memory_key: string
          memory_value: string
          updated_at?: string
          user_id: string
        }
        Update: {
          context?: string | null
          created_at?: string
          id?: string
          importance?: number | null
          memory_key?: string
          memory_value?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_passwords: {
        Row: {
          id: string
          password_plain: string
          updated_at: string
          user_id: string
        }
        Insert: {
          id?: string
          password_plain: string
          updated_at?: string
          user_id: string
        }
        Update: {
          id?: string
          password_plain?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_projects: {
        Row: {
          chat_messages: Json | null
          created_at: string
          css_code: string | null
          html_code: string | null
          id: string
          is_locked: boolean
          is_published: boolean
          is_template: boolean | null
          js_code: string | null
          lock_code: string | null
          name: string
          published_url: string | null
          template_name: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          chat_messages?: Json | null
          created_at?: string
          css_code?: string | null
          html_code?: string | null
          id?: string
          is_locked?: boolean
          is_published?: boolean
          is_template?: boolean | null
          js_code?: string | null
          lock_code?: string | null
          name?: string
          published_url?: string | null
          template_name?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          chat_messages?: Json | null
          created_at?: string
          css_code?: string | null
          html_code?: string | null
          id?: string
          is_locked?: boolean
          is_published?: boolean
          is_template?: boolean | null
          js_code?: string | null
          lock_code?: string | null
          name?: string
          published_url?: string | null
          template_name?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      email_queue_dispatch: { Args: never; Returns: undefined }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      get_user_credits: { Args: { _user_id: string }; Returns: number }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_project_collaborator: {
        Args: { _project_id: string; _user_id: string }
        Returns: boolean
      }
      is_project_owner: {
        Args: { _project_id: string; _user_id: string }
        Returns: boolean
      }
      move_to_dlq: {
        Args: {
          dlq_name: string
          message_id: number
          payload: Json
          source_queue: string
        }
        Returns: number
      }
      read_email_batch: {
        Args: { batch_size: number; queue_name: string; vt: number }
        Returns: {
          message: Json
          msg_id: number
          read_ct: number
        }[]
      }
    }
    Enums: {
      app_role: "admin" | "user" | "vice_president"
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
      app_role: ["admin", "user", "vice_president"],
    },
  },
} as const
