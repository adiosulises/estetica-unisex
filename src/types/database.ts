// Auto-generado desde Supabase — no editar manualmente
// Última actualización: 2026-05-04

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
      audit_log: {
        Row: {
          action: string
          created_at: string
          employee_id: string | null
          id: string
          new_data: Json | null
          old_data: Json | null
          reason: string
          record_id: string
          table_name: string
        }
        Insert: {
          action: string
          created_at?: string
          employee_id?: string | null
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          reason: string
          record_id: string
          table_name: string
        }
        Update: {
          action?: string
          created_at?: string
          employee_id?: string | null
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          reason?: string
          record_id?: string
          table_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_log_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      brand_payout_items: {
        Row: {
          brand_amount: number
          id: string
          payout_id: string
          product_name: string
          quantity: number
          sale_item_id: string
          unit_price: number
          variant_sku: string
        }
        Insert: {
          brand_amount: number
          id?: string
          payout_id: string
          product_name: string
          quantity: number
          sale_item_id: string
          unit_price: number
          variant_sku: string
        }
        Update: {
          brand_amount?: number
          id?: string
          payout_id?: string
          product_name?: string
          quantity?: number
          sale_item_id?: string
          unit_price?: number
          variant_sku?: string
        }
        Relationships: [
          {
            foreignKeyName: "brand_payout_items_payout_id_fkey"
            columns: ["payout_id"]
            isOneToOne: false
            referencedRelation: "brand_payouts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "brand_payout_items_sale_item_id_fkey"
            columns: ["sale_item_id"]
            isOneToOne: false
            referencedRelation: "sale_items"
            referencedColumns: ["id"]
          },
        ]
      }
      brand_payouts: {
        Row: {
          brand_amount: number
          brand_id: string
          created_at: string
          id: string
          notes: string | null
          paid_at: string | null
          payment_method: Database["public"]["Enums"]["payment_method"] | null
          period_end: string
          period_start: string
          status: Database["public"]["Enums"]["payout_status"]
          store_amount: number
          total_sold: number
          updated_at: string
        }
        Insert: {
          brand_amount?: number
          brand_id: string
          created_at?: string
          id?: string
          notes?: string | null
          paid_at?: string | null
          payment_method?: Database["public"]["Enums"]["payment_method"] | null
          period_end: string
          period_start: string
          status?: Database["public"]["Enums"]["payout_status"]
          store_amount?: number
          total_sold?: number
          updated_at?: string
        }
        Update: {
          brand_amount?: number
          brand_id?: string
          created_at?: string
          id?: string
          notes?: string | null
          paid_at?: string | null
          payment_method?: Database["public"]["Enums"]["payment_method"] | null
          period_end?: string
          period_start?: string
          status?: Database["public"]["Enums"]["payout_status"]
          store_amount?: number
          total_sold?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "brand_payouts_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
        ]
      }
      brands: {
        Row: {
          bank_account: string | null
          contact_email: string | null
          contact_name: string | null
          contact_phone: string | null
          contract_type: string
          contract_value: number
          created_at: string
          deleted_at: string | null
          id: string
          is_active: boolean
          name: string
          notes: string | null
          sku_prefix: string | null
          updated_at: string
        }
        Insert: {
          bank_account?: string | null
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          contract_type?: string
          contract_value?: number
          created_at?: string
          deleted_at?: string | null
          id?: string
          is_active?: boolean
          name: string
          notes?: string | null
          sku_prefix?: string | null
          updated_at?: string
        }
        Update: {
          bank_account?: string | null
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          contract_type?: string
          contract_value?: number
          created_at?: string
          deleted_at?: string | null
          id?: string
          is_active?: boolean
          name?: string
          notes?: string | null
          sku_prefix?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      cash_movements: {
        Row: {
          amount: number
          created_at: string
          description: string
          employee_id: string | null
          id: string
          payment_method: Database["public"]["Enums"]["payment_method"] | null
          reference_id: string | null
          reference_type: string | null
          type: Database["public"]["Enums"]["movement_type"]
        }
        Insert: {
          amount: number
          created_at?: string
          description: string
          employee_id?: string | null
          id?: string
          payment_method?: Database["public"]["Enums"]["payment_method"] | null
          reference_id?: string | null
          reference_type?: string | null
          type: Database["public"]["Enums"]["movement_type"]
        }
        Update: {
          amount?: number
          created_at?: string
          description?: string
          employee_id?: string | null
          id?: string
          payment_method?: Database["public"]["Enums"]["payment_method"] | null
          reference_id?: string | null
          reference_type?: string | null
          type?: Database["public"]["Enums"]["movement_type"]
        }
        Relationships: [
          {
            foreignKeyName: "cash_movements_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      cash_registers: {
        Row: {
          closed_by: string | null
          closing_card: number | null
          closing_cash: number | null
          created_at: string
          date: string
          difference: number | null
          expected_card: number | null
          expected_cash: number | null
          id: string
          notes: string | null
          opened_by: string | null
          opening_card: number
          opening_cash: number
          total_card_sales: number
          total_cash_sales: number
          total_sales: number
          total_transfer_sales: number
          updated_at: string
        }
        Insert: {
          closed_by?: string | null
          closing_card?: number | null
          closing_cash?: number | null
          created_at?: string
          date: string
          difference?: number | null
          expected_card?: number | null
          expected_cash?: number | null
          id?: string
          notes?: string | null
          opened_by?: string | null
          opening_card?: number
          opening_cash?: number
          total_card_sales?: number
          total_cash_sales?: number
          total_sales?: number
          total_transfer_sales?: number
          updated_at?: string
        }
        Update: {
          closed_by?: string | null
          closing_card?: number | null
          closing_cash?: number | null
          created_at?: string
          date?: string
          difference?: number | null
          expected_card?: number | null
          expected_cash?: number | null
          id?: string
          notes?: string | null
          opened_by?: string | null
          opening_card?: number
          opening_cash?: number
          total_card_sales?: number
          total_cash_sales?: number
          total_sales?: number
          total_transfer_sales?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cash_registers_closed_by_fkey"
            columns: ["closed_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_registers_opened_by_fkey"
            columns: ["opened_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      employees: {
        Row: {
          created_at: string
          full_name: string
          id: string
          is_active: boolean
          phone: string | null
          role: string
          salary_pct: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          full_name: string
          id: string
          is_active?: boolean
          phone?: string | null
          role?: string
          salary_pct?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          full_name?: string
          id?: string
          is_active?: boolean
          phone?: string | null
          role?: string
          salary_pct?: number
          updated_at?: string
        }
        Relationships: []
      }
      event_registrations: {
        Row: {
          amount_paid: number
          created_at: string
          customer_name: string
          customer_phone: string | null
          employee_id: string | null
          event_id: string
          id: string
          notes: string | null
          payment_method: Database["public"]["Enums"]["payment_method"]
          status: string
        }
        Insert: {
          amount_paid: number
          created_at?: string
          customer_name: string
          customer_phone?: string | null
          employee_id?: string | null
          event_id: string
          id?: string
          notes?: string | null
          payment_method: Database["public"]["Enums"]["payment_method"]
          status?: string
        }
        Update: {
          amount_paid?: number
          created_at?: string
          customer_name?: string
          customer_phone?: string | null
          employee_id?: string | null
          event_id?: string
          id?: string
          notes?: string | null
          payment_method?: Database["public"]["Enums"]["payment_method"]
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_registrations_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_registrations_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          brand_id: string | null
          capacity: number | null
          created_at: string
          description: string | null
          event_date: string
          id: string
          is_active: boolean
          name: string
          organizer_share_type: string | null
          organizer_share_value: number | null
          price_per_person: number
          production_cost: number | null
          production_paid_by_employee_id: string | null
          production_paid_by_store: boolean
        }
        Insert: {
          brand_id?: string | null
          capacity?: number | null
          created_at?: string
          description?: string | null
          event_date: string
          id?: string
          is_active?: boolean
          name: string
          organizer_share_type?: string | null
          organizer_share_value?: number | null
          price_per_person: number
          production_cost?: number | null
          production_paid_by_employee_id?: string | null
          production_paid_by_store?: boolean
        }
        Update: {
          brand_id?: string | null
          capacity?: number | null
          created_at?: string
          description?: string | null
          event_date?: string
          id?: string
          is_active?: boolean
          name?: string
          organizer_share_type?: string | null
          organizer_share_value?: number | null
          price_per_person?: number
          production_cost?: number | null
          production_paid_by_employee_id?: string | null
          production_paid_by_store?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "events_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_production_paid_by_employee_id_fkey"
            columns: ["production_paid_by_employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      fixed_expense_payments: {
        Row: {
          amount: number
          concept: string
          created_at: string
          id: string
          notes: string | null
          paid_at: string | null
          payment_method: Database["public"]["Enums"]["payment_method"] | null
          period_end: string
          period_start: string
          status: string
        }
        Insert: {
          amount: number
          concept: string
          created_at?: string
          id?: string
          notes?: string | null
          paid_at?: string | null
          payment_method?: Database["public"]["Enums"]["payment_method"] | null
          period_end: string
          period_start: string
          status?: string
        }
        Update: {
          amount?: number
          concept?: string
          created_at?: string
          id?: string
          notes?: string | null
          paid_at?: string | null
          payment_method?: Database["public"]["Enums"]["payment_method"] | null
          period_end?: string
          period_start?: string
          status?: string
        }
        Relationships: []
      }
      layaway_payments: {
        Row: {
          amount: number
          created_at: string
          employee_id: string | null
          id: string
          layaway_id: string
          method: Database["public"]["Enums"]["payment_method"]
        }
        Insert: {
          amount: number
          created_at?: string
          employee_id?: string | null
          id?: string
          layaway_id: string
          method: Database["public"]["Enums"]["payment_method"]
        }
        Update: {
          amount?: number
          created_at?: string
          employee_id?: string | null
          id?: string
          layaway_id?: string
          method?: Database["public"]["Enums"]["payment_method"]
        }
        Relationships: [
          {
            foreignKeyName: "layaway_payments_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "layaway_payments_layaway_id_fkey"
            columns: ["layaway_id"]
            isOneToOne: false
            referencedRelation: "layaways"
            referencedColumns: ["id"]
          },
        ]
      }
      layaways: {
        Row: {
          amount_paid: number
          converted_sale_id: string | null
          created_at: string
          customer_name: string
          customer_phone: string | null
          employee_id: string | null
          expires_at: string
          id: string
          notes: string | null
          quantity: number
          status: string
          total_price: number
          updated_at: string
          variant_id: string
        }
        Insert: {
          amount_paid?: number
          converted_sale_id?: string | null
          created_at?: string
          customer_name: string
          customer_phone?: string | null
          employee_id?: string | null
          expires_at: string
          id?: string
          notes?: string | null
          quantity?: number
          status?: string
          total_price: number
          updated_at?: string
          variant_id: string
        }
        Update: {
          amount_paid?: number
          converted_sale_id?: string | null
          created_at?: string
          customer_name?: string
          customer_phone?: string | null
          employee_id?: string | null
          expires_at?: string
          id?: string
          notes?: string | null
          quantity?: number
          status?: string
          total_price?: number
          updated_at?: string
          variant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "layaways_converted_sale_id_fkey"
            columns: ["converted_sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "layaways_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "layaways_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      payroll_config: {
        Row: {
          ads_pct: number
          card_rate: number
          construction_pct: number
          id: string
          iva_rate: number
          maintenance_pct: number
          monthly_goal: number
          rent_amount: number
          salary_pool_pct: number
          savings_pct: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          ads_pct?: number
          card_rate?: number
          construction_pct?: number
          id?: string
          iva_rate?: number
          maintenance_pct?: number
          monthly_goal?: number
          rent_amount?: number
          salary_pool_pct?: number
          savings_pct?: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          ads_pct?: number
          card_rate?: number
          construction_pct?: number
          id?: string
          iva_rate?: number
          maintenance_pct?: number
          monthly_goal?: number
          rent_amount?: number
          salary_pool_pct?: number
          savings_pct?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payroll_config_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      product_variants: {
        Row: {
          color: string | null
          created_at: string
          id: string
          is_active: boolean
          low_stock_threshold: number
          price: number | null
          product_id: string
          size: string | null
          sku: string
          stock: number
          updated_at: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          low_stock_threshold?: number
          price?: number | null
          product_id: string
          size?: string | null
          sku?: string  // generated by trigger — optional on insert
          stock?: number
          updated_at?: string
        }
        Update: {
          color?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          low_stock_threshold?: number
          price?: number | null
          product_id?: string
          size?: string | null
          sku?: string
          stock?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_variants_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          base_price: number
          brand_id: string | null
          category: string
          created_at: string
          deleted_at: string | null
          description: string | null
          event_capacity: number | null
          event_date: string | null
          id: string
          is_active: boolean
          kind: Database["public"]["Enums"]["product_kind"]
          name: string
          organizer_share_type: string | null
          organizer_share_value: number | null
          photo_url: string | null
          production_cost: number | null
          production_notes: string | null
          production_paid_by_employee_id: string | null
          production_paid_by_store: boolean
          sku_prefix: string
          updated_at: string
        }
        Insert: {
          base_price?: number
          brand_id?: string | null
          category?: string
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          event_capacity?: number | null
          event_date?: string | null
          id?: string
          is_active?: boolean
          kind?: Database["public"]["Enums"]["product_kind"]
          name: string
          organizer_share_type?: string | null
          organizer_share_value?: number | null
          photo_url?: string | null
          production_cost?: number | null
          production_notes?: string | null
          production_paid_by_employee_id?: string | null
          production_paid_by_store?: boolean
          sku_prefix: string
          updated_at?: string
        }
        Update: {
          base_price?: number
          brand_id?: string | null
          category?: string
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          event_capacity?: number | null
          event_date?: string | null
          id?: string
          is_active?: boolean
          kind?: Database["public"]["Enums"]["product_kind"]
          name?: string
          organizer_share_type?: string | null
          organizer_share_value?: number | null
          photo_url?: string | null
          production_cost?: number | null
          production_notes?: string | null
          production_paid_by_employee_id?: string | null
          production_paid_by_store?: boolean
          sku_prefix?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_production_paid_by_employee_id_fkey"
            columns: ["production_paid_by_employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      salary_payments: {
        Row: {
          amount: number
          created_at: string
          employee_id: string
          id: string
          notes: string | null
          paid_at: string | null
          payment_method: Database["public"]["Enums"]["payment_method"] | null
          period_end: string
          period_start: string
          status: string
        }
        Insert: {
          amount: number
          created_at?: string
          employee_id: string
          id?: string
          notes?: string | null
          paid_at?: string | null
          payment_method?: Database["public"]["Enums"]["payment_method"] | null
          period_end: string
          period_start: string
          status?: string
        }
        Update: {
          amount?: number
          created_at?: string
          employee_id?: string
          id?: string
          notes?: string | null
          paid_at?: string | null
          payment_method?: Database["public"]["Enums"]["payment_method"] | null
          period_end?: string
          period_start?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "salary_payments_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      sale_items: {
        Row: {
          brand_amount: number | null
          brand_id: string | null
          contract_type_snap: string | null
          contract_value_snap: number | null
          created_at: string
          discount: number
          id: string
          quantity: number
          sale_id: string
          store_amount: number | null
          subtotal: number
          unit_price: number
          variant_id: string
        }
        Insert: {
          brand_amount?: number | null
          brand_id?: string | null
          contract_type_snap?: string | null
          contract_value_snap?: number | null
          created_at?: string
          discount?: number
          id?: string
          quantity?: number
          sale_id: string
          store_amount?: number | null
          subtotal: number
          unit_price: number
          variant_id: string
        }
        Update: {
          brand_amount?: number | null
          brand_id?: string | null
          contract_type_snap?: string | null
          contract_value_snap?: number | null
          created_at?: string
          discount?: number
          id?: string
          quantity?: number
          sale_id?: string
          store_amount?: number | null
          subtotal?: number
          unit_price?: number
          variant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sale_items_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sale_items_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sale_items_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      sales: {
        Row: {
          created_at: string
          discount: number
          employee_id: string | null
          folio: string | null
          id: string
          notes: string | null
          paid_card: number
          paid_cash: number
          paid_transfer: number
          payment_method: Database["public"]["Enums"]["payment_method"]
          status: Database["public"]["Enums"]["sale_status"]
          subtotal: number
          total: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          discount?: number
          employee_id?: string | null
          folio?: string | null
          id?: string
          notes?: string | null
          paid_card?: number
          paid_cash?: number
          paid_transfer?: number
          payment_method?: Database["public"]["Enums"]["payment_method"]
          status?: Database["public"]["Enums"]["sale_status"]
          subtotal?: number
          total?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          discount?: number
          employee_id?: string | null
          folio?: string | null
          id?: string
          notes?: string | null
          paid_card?: number
          paid_cash?: number
          paid_transfer?: number
          payment_method?: Database["public"]["Enums"]["payment_method"]
          status?: Database["public"]["Enums"]["sale_status"]
          subtotal?: number
          total?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sales_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      category_balance_logs: {
        Row: {
          id: string
          category: string
          old_balance: number
          new_balance: number
          set_by_name: string
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          category: string
          old_balance: number
          new_balance: number
          set_by_name: string
          notes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          category?: string
          old_balance?: number
          new_balance?: number
          set_by_name?: string
          notes?: string | null
          created_at?: string
        }
        Relationships: []
      }
      category_balances: {
        Row: {
          category: string
          balance: number
          updated_at: string
        }
        Insert: {
          category: string
          balance?: number
          updated_at?: string
        }
        Update: {
          category?: string
          balance?: number
          updated_at?: string
        }
        Relationships: []
      }
      store_liquidation_items: {
        Row: {
          id: string
          liquidation_id: string
          category: string
          employee_id: string | null
          employee_name: string | null
          allocated_amount: number
          payment_method: string | null
          status: string
          paid_at: string | null
          notes: string | null
          sort_order: number
          created_at: string
        }
        Insert: {
          id?: string
          liquidation_id: string
          category: string
          employee_id?: string | null
          employee_name?: string | null
          allocated_amount: number
          payment_method?: string | null
          status?: string
          paid_at?: string | null
          notes?: string | null
          sort_order?: number
          created_at?: string
        }
        Update: {
          id?: string
          liquidation_id?: string
          category?: string
          employee_id?: string | null
          employee_name?: string | null
          allocated_amount?: number
          payment_method?: string | null
          status?: string
          paid_at?: string | null
          notes?: string | null
          sort_order?: number
          created_at?: string
        }
        Relationships: []
      }
      store_liquidations: {
        Row: {
          id: string
          period_month: string
          gross_sales: number
          iva_amount: number
          card_commission: number
          brand_total: number
          store_net: number
          rent_deducted: number
          distributable: number
          status: string
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          period_month: string
          gross_sales?: number
          iva_amount?: number
          card_commission?: number
          brand_total?: number
          store_net?: number
          rent_deducted?: number
          distributable?: number
          status?: string
          notes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          period_month?: string
          gross_sales?: number
          iva_amount?: number
          card_commission?: number
          brand_total?: number
          store_net?: number
          rent_deducted?: number
          distributable?: number
          status?: string
          notes?: string | null
          created_at?: string
        }
        Relationships: []
      }
      spending_transactions: {
        Row: {
          id: string
          category: string
          amount: number
          concept: string
          performed_by: string
          transaction_date: string
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          category: string
          amount: number
          concept: string
          performed_by: string
          transaction_date?: string
          notes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          category?: string
          amount?: number
          concept?: string
          performed_by?: string
          transaction_date?: string
          notes?: string | null
          created_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      cash_balance: {
        Row: {
          balance: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      create_sale: {
        Args: {
          p_items: Json
          p_notes?: string
          p_paid_card?: number
          p_paid_cash?: number
          p_paid_transfer?: number
        }
        Returns: Json
      }
      mark_liquidation_item_paid: {
        Args: {
          p_item_id: string
          p_payment_method: string
          p_notes?: string
        }
        Returns: undefined
      }
      create_spending_transaction: {
        Args: {
          p_category: string
          p_amount: number
          p_concept: string
          p_performed_by: string
          p_transaction_date: string
          p_notes?: string
        }
        Returns: string
      }
      set_category_balance: {
        Args: {
          p_category: string
          p_new_balance: number
          p_set_by_name: string
          p_notes?: string
        }
        Returns: undefined
      }
      my_role: { Args: never; Returns: string }
    }
    Enums: {
      movement_type:
        | "sale"
        | "brand_payment"
        | "floor_income"
        | "salary"
        | "rent"
        | "maintenance"
        | "savings"
        | "debt_payment"
        | "construction"
        | "production_reimbursement"
        | "event_income"
        | "deposit"
        | "withdrawal"
        | "adjustment"
      payment_method: "cash" | "card" | "transfer" | "mixed"
      payout_status: "pending" | "paid" | "partial"
      product_kind: "consignment" | "own" | "ticket" | "service"
      sale_status: "pending" | "completed" | "cancelled" | "refunded"
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
      movement_type: [
        "sale",
        "brand_payment",
        "floor_income",
        "salary",
        "rent",
        "maintenance",
        "savings",
        "debt_payment",
        "construction",
        "production_reimbursement",
        "event_income",
        "deposit",
        "withdrawal",
        "adjustment",
      ],
      payment_method: ["cash", "card", "transfer", "mixed"],
      payout_status: ["pending", "paid", "partial"],
      product_kind: ["consignment", "own", "ticket", "service"],
      sale_status: ["pending", "completed", "cancelled", "refunded"],
    },
  },
} as const
