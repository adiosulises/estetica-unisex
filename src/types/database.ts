// Generado manualmente del schema.sql
// Para regenerar: npx supabase gen types typescript --project-id <id> > src/types/database.ts

export type Database = {
  public: {
    Tables: {
      employees: {
        Row: {
          id: string;
          full_name: string;
          phone: string | null;
          role: "admin" | "employee";
          salary_pct: number;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          full_name: string;
          phone?: string | null;
          role?: "admin" | "employee";
          salary_pct?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          full_name?: string;
          phone?: string | null;
          role?: "admin" | "employee";
          salary_pct?: number;
          is_active?: boolean;
          updated_at?: string;
        };
        Relationships: [];
      };
      brands: {
        Row: {
          id: string;
          name: string;
          sku_prefix: string | null;
          contact_name: string | null;
          contact_email: string | null;
          contact_phone: string | null;
          bank_account: string | null;
          contract_type: "pct" | "floor";
          contract_value: number;
          notes: string | null;
          is_active: boolean;
          deleted_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          sku_prefix?: string | null;
          contact_name?: string | null;
          contact_email?: string | null;
          contact_phone?: string | null;
          bank_account?: string | null;
          contract_type?: "pct" | "floor";
          contract_value?: number;
          notes?: string | null;
          is_active?: boolean;
          deleted_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          name?: string;
          sku_prefix?: string | null;
          contact_name?: string | null;
          contact_email?: string | null;
          contact_phone?: string | null;
          bank_account?: string | null;
          contract_type?: "pct" | "floor";
          contract_value?: number;
          notes?: string | null;
          is_active?: boolean;
          deleted_at?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      products: {
        Row: {
          id: string;
          sku_prefix: string;
          name: string;
          description: string | null;
          brand_id: string | null;
          kind: "consignment" | "own" | "ticket" | "service";
          category: string;
          base_price: number;
          production_cost: number | null;
          production_paid_by_employee_id: string | null;
          production_paid_by_store: boolean;
          production_notes: string | null;
          event_date: string | null;
          event_capacity: number | null;
          organizer_share_type: "pct" | "fixed" | null;
          organizer_share_value: number | null;
          photo_url: string | null;
          is_active: boolean;
          deleted_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          sku_prefix: string;
          name: string;
          description?: string | null;
          brand_id?: string | null;
          kind?: "consignment" | "own" | "ticket" | "service";
          category?: string;
          base_price?: number;
          production_cost?: number | null;
          production_paid_by_employee_id?: string | null;
          production_paid_by_store?: boolean;
          production_notes?: string | null;
          event_date?: string | null;
          event_capacity?: number | null;
          organizer_share_type?: "pct" | "fixed" | null;
          organizer_share_value?: number | null;
          photo_url?: string | null;
          is_active?: boolean;
          deleted_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          sku_prefix?: string;
          name?: string;
          description?: string | null;
          brand_id?: string | null;
          kind?: "consignment" | "own" | "ticket" | "service";
          category?: string;
          base_price?: number;
          production_cost?: number | null;
          production_paid_by_employee_id?: string | null;
          production_paid_by_store?: boolean;
          production_notes?: string | null;
          event_date?: string | null;
          event_capacity?: number | null;
          organizer_share_type?: "pct" | "fixed" | null;
          organizer_share_value?: number | null;
          photo_url?: string | null;
          is_active?: boolean;
          deleted_at?: string | null;
          updated_at?: string;
        };
        Relationships: [
          { foreignKeyName: "products_brand_id_fkey"; columns: ["brand_id"]; referencedRelation: "brands"; referencedColumns: ["id"] },
          { foreignKeyName: "products_production_paid_by_employee_id_fkey"; columns: ["production_paid_by_employee_id"]; referencedRelation: "employees"; referencedColumns: ["id"] }
        ];
      };
      product_variants: {
        Row: {
          id: string;
          product_id: string;
          sku: string;
          size: string | null;
          color: string | null;
          price: number | null;
          stock: number;
          low_stock_threshold: number;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          product_id: string;
          sku?: string;
          size?: string | null;
          color?: string | null;
          price?: number | null;
          stock?: number;
          low_stock_threshold?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          size?: string | null;
          color?: string | null;
          price?: number | null;
          stock?: number;
          low_stock_threshold?: number;
          is_active?: boolean;
          updated_at?: string;
        };
        Relationships: [
          { foreignKeyName: "product_variants_product_id_fkey"; columns: ["product_id"]; referencedRelation: "products"; referencedColumns: ["id"] }
        ];
      };
      sales: {
        Row: {
          id: string;
          folio: string | null;
          employee_id: string | null;
          status: "pending" | "completed" | "cancelled" | "refunded";
          subtotal: number;
          discount: number;
          total: number;
          paid_cash: number;
          paid_card: number;
          paid_transfer: number;
          payment_method: "cash" | "card" | "transfer" | "mixed";
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          folio?: string | null;
          employee_id?: string | null;
          status?: "pending" | "completed" | "cancelled" | "refunded";
          subtotal?: number;
          discount?: number;
          total: number;
          paid_cash?: number;
          paid_card?: number;
          paid_transfer?: number;
          payment_method: "cash" | "card" | "transfer" | "mixed";
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          status?: "pending" | "completed" | "cancelled" | "refunded";
          subtotal?: number;
          discount?: number;
          total?: number;
          paid_cash?: number;
          paid_card?: number;
          paid_transfer?: number;
          payment_method?: "cash" | "card" | "transfer" | "mixed";
          notes?: string | null;
          updated_at?: string;
        };
        Relationships: [
          { foreignKeyName: "sales_employee_id_fkey"; columns: ["employee_id"]; referencedRelation: "employees"; referencedColumns: ["id"] }
        ];
      };
      sale_items: {
        Row: {
          id: string;
          sale_id: string;
          variant_id: string;
          quantity: number;
          unit_price: number;
          discount: number;
          subtotal: number;
          brand_id: string | null;
          contract_type_snap: string | null;
          contract_value_snap: number | null;
          brand_amount: number | null;
          store_amount: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          sale_id: string;
          variant_id: string;
          quantity?: number;
          unit_price: number;
          discount?: number;
          subtotal: number;
          brand_id?: string | null;
          contract_type_snap?: string | null;
          contract_value_snap?: number | null;
          brand_amount?: number | null;
          store_amount?: number | null;
          created_at?: string;
        };
        Update: never;
        Relationships: [
          { foreignKeyName: "sale_items_sale_id_fkey"; columns: ["sale_id"]; referencedRelation: "sales"; referencedColumns: ["id"] },
          { foreignKeyName: "sale_items_variant_id_fkey"; columns: ["variant_id"]; referencedRelation: "product_variants"; referencedColumns: ["id"] }
        ];
      };
      cash_movements: {
        Row: {
          id: string;
          type: "sale" | "brand_payment" | "floor_income" | "salary" | "rent" | "maintenance" | "savings" | "debt_payment" | "construction" | "production_reimbursement" | "event_income" | "deposit" | "withdrawal" | "adjustment";
          amount: number;
          description: string;
          reference_id: string | null;
          reference_type: string | null;
          employee_id: string | null;
          payment_method: "cash" | "card" | "transfer" | "mixed" | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          type: "sale" | "brand_payment" | "floor_income" | "salary" | "rent" | "maintenance" | "savings" | "debt_payment" | "construction" | "production_reimbursement" | "event_income" | "deposit" | "withdrawal" | "adjustment";
          amount: number;
          description: string;
          reference_id?: string | null;
          reference_type?: string | null;
          employee_id?: string | null;
          payment_method?: "cash" | "card" | "transfer" | "mixed" | null;
          created_at?: string;
        };
        Update: never;
        Relationships: [
          { foreignKeyName: "cash_movements_employee_id_fkey"; columns: ["employee_id"]; referencedRelation: "employees"; referencedColumns: ["id"] }
        ];
      };
      cash_registers: {
        Row: {
          id: string;
          date: string;
          opening_cash: number;
          closing_cash: number | null;
          expected_cash: number | null;
          difference: number | null;
          total_sales: number;
          total_cash_sales: number;
          total_card_sales: number;
          total_transfer_sales: number;
          opened_by: string | null;
          closed_by: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          date: string;
          opening_cash?: number;
          closing_cash?: number | null;
          expected_cash?: number | null;
          difference?: number | null;
          total_sales?: number;
          total_cash_sales?: number;
          total_card_sales?: number;
          total_transfer_sales?: number;
          opened_by?: string | null;
          closed_by?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          closing_cash?: number | null;
          expected_cash?: number | null;
          difference?: number | null;
          total_sales?: number;
          total_cash_sales?: number;
          total_card_sales?: number;
          total_transfer_sales?: number;
          closed_by?: string | null;
          notes?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      audit_log: {
        Row: {
          id: string;
          table_name: string;
          record_id: string;
          action: string;
          old_data: Record<string, unknown> | null;
          new_data: Record<string, unknown> | null;
          reason: string;
          employee_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          table_name: string;
          record_id: string;
          action: string;
          old_data?: Record<string, unknown> | null;
          new_data?: Record<string, unknown> | null;
          reason: string;
          employee_id?: string | null;
          created_at?: string;
        };
        Update: never;
        Relationships: [];
      };
      brand_payouts: {
        Row: {
          id: string;
          brand_id: string;
          period_start: string;
          period_end: string;
          total_sold: number;
          brand_amount: number;
          store_amount: number;
          status: "pending" | "paid" | "partial";
          paid_at: string | null;
          payment_method: "cash" | "card" | "transfer" | "mixed" | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          brand_id: string;
          period_start: string;
          period_end: string;
          total_sold?: number;
          brand_amount?: number;
          store_amount?: number;
          status?: "pending" | "paid" | "partial";
          paid_at?: string | null;
          payment_method?: "cash" | "card" | "transfer" | "mixed" | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          status?: "pending" | "paid" | "partial";
          paid_at?: string | null;
          payment_method?: "cash" | "card" | "transfer" | "mixed" | null;
          notes?: string | null;
          updated_at?: string;
        };
        Relationships: [
          { foreignKeyName: "brand_payouts_brand_id_fkey"; columns: ["brand_id"]; referencedRelation: "brands"; referencedColumns: ["id"] }
        ];
      };
      brand_payout_items: {
        Row: {
          id: string;
          payout_id: string;
          sale_item_id: string;
          product_name: string;
          variant_sku: string;
          quantity: number;
          unit_price: number;
          brand_amount: number;
        };
        Insert: {
          id?: string;
          payout_id: string;
          sale_item_id: string;
          product_name: string;
          variant_sku: string;
          quantity: number;
          unit_price: number;
          brand_amount: number;
        };
        Update: never;
        Relationships: [
          { foreignKeyName: "brand_payout_items_payout_id_fkey"; columns: ["payout_id"]; referencedRelation: "brand_payouts"; referencedColumns: ["id"] }
        ];
      };
      payroll_config: {
        Row: {
          id: string;
          rent_amount: number;
          maintenance_pct: number;
          savings_pct: number;
          ads_pct: number;
          construction_pct: number;
          salary_pool_pct: number;
          updated_at: string;
          updated_by: string | null;
        };
        Insert: {
          id?: string;
          rent_amount?: number;
          maintenance_pct?: number;
          savings_pct?: number;
          ads_pct?: number;
          construction_pct?: number;
          salary_pool_pct?: number;
          updated_at?: string;
          updated_by?: string | null;
        };
        Update: {
          rent_amount?: number;
          maintenance_pct?: number;
          savings_pct?: number;
          ads_pct?: number;
          construction_pct?: number;
          salary_pool_pct?: number;
          updated_at?: string;
          updated_by?: string | null;
        };
        Relationships: [];
      };
      salary_payments: {
        Row: {
          id: string;
          employee_id: string;
          period_start: string;
          period_end: string;
          amount: number;
          status: "pending" | "paid";
          paid_at: string | null;
          payment_method: "cash" | "card" | "transfer" | "mixed" | null;
          notes: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          employee_id: string;
          period_start: string;
          period_end: string;
          amount: number;
          status?: "pending" | "paid";
          paid_at?: string | null;
          payment_method?: "cash" | "card" | "transfer" | "mixed" | null;
          notes?: string | null;
          created_at?: string;
        };
        Update: {
          status?: "pending" | "paid";
          paid_at?: string | null;
          payment_method?: "cash" | "card" | "transfer" | "mixed" | null;
          notes?: string | null;
        };
        Relationships: [
          { foreignKeyName: "salary_payments_employee_id_fkey"; columns: ["employee_id"]; referencedRelation: "employees"; referencedColumns: ["id"] }
        ];
      };
      fixed_expense_payments: {
        Row: {
          id: string;
          concept: string;
          period_start: string;
          period_end: string;
          amount: number;
          status: "pending" | "paid";
          paid_at: string | null;
          payment_method: "cash" | "card" | "transfer" | "mixed" | null;
          notes: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          concept: string;
          period_start: string;
          period_end: string;
          amount: number;
          status?: "pending" | "paid";
          paid_at?: string | null;
          payment_method?: "cash" | "card" | "transfer" | "mixed" | null;
          notes?: string | null;
          created_at?: string;
        };
        Update: {
          status?: "pending" | "paid";
          paid_at?: string | null;
          payment_method?: "cash" | "card" | "transfer" | "mixed" | null;
          notes?: string | null;
        };
        Relationships: [];
      };
      layaways: {
        Row: {
          id: string;
          customer_name: string;
          customer_phone: string | null;
          variant_id: string;
          quantity: number;
          total_price: number;
          amount_paid: number;
          expires_at: string;
          status: "active" | "completed" | "expired" | "cancelled";
          converted_sale_id: string | null;
          employee_id: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          customer_name: string;
          customer_phone?: string | null;
          variant_id: string;
          quantity?: number;
          total_price: number;
          amount_paid?: number;
          expires_at: string;
          status?: "active" | "completed" | "expired" | "cancelled";
          converted_sale_id?: string | null;
          employee_id?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          amount_paid?: number;
          expires_at?: string;
          status?: "active" | "completed" | "expired" | "cancelled";
          converted_sale_id?: string | null;
          notes?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      layaway_payments: {
        Row: {
          id: string;
          layaway_id: string;
          amount: number;
          method: "cash" | "card" | "transfer" | "mixed";
          employee_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          layaway_id: string;
          amount: number;
          method: "cash" | "card" | "transfer" | "mixed";
          employee_id?: string | null;
          created_at?: string;
        };
        Update: never;
        Relationships: [];
      };
      events: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          brand_id: string | null;
          event_date: string;
          price_per_person: number;
          capacity: number | null;
          organizer_share_type: "pct" | "fixed" | null;
          organizer_share_value: number | null;
          production_cost: number | null;
          production_paid_by_employee_id: string | null;
          production_paid_by_store: boolean;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          brand_id?: string | null;
          event_date: string;
          price_per_person: number;
          capacity?: number | null;
          organizer_share_type?: "pct" | "fixed" | null;
          organizer_share_value?: number | null;
          production_cost?: number | null;
          production_paid_by_employee_id?: string | null;
          production_paid_by_store?: boolean;
          is_active?: boolean;
          created_at?: string;
        };
        Update: {
          name?: string;
          description?: string | null;
          brand_id?: string | null;
          event_date?: string;
          price_per_person?: number;
          capacity?: number | null;
          organizer_share_type?: "pct" | "fixed" | null;
          organizer_share_value?: number | null;
          production_cost?: number | null;
          production_paid_by_employee_id?: string | null;
          production_paid_by_store?: boolean;
          is_active?: boolean;
        };
        Relationships: [];
      };
      event_registrations: {
        Row: {
          id: string;
          event_id: string;
          customer_name: string;
          customer_phone: string | null;
          amount_paid: number;
          payment_method: "cash" | "card" | "transfer" | "mixed";
          status: "confirmed" | "cancelled" | "waitlist";
          employee_id: string | null;
          notes: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          event_id: string;
          customer_name: string;
          customer_phone?: string | null;
          amount_paid: number;
          payment_method: "cash" | "card" | "transfer" | "mixed";
          status?: "confirmed" | "cancelled" | "waitlist";
          employee_id?: string | null;
          notes?: string | null;
          created_at?: string;
        };
        Update: {
          amount_paid?: number;
          payment_method?: "cash" | "card" | "transfer" | "mixed";
          status?: "confirmed" | "cancelled" | "waitlist";
          notes?: string | null;
        };
        Relationships: [];
      };
    };
    Views: {
      cash_balance: {
        Row: { balance: number };
        Relationships: [];
      };
    };
    Functions: {
      create_sale: {
        Args: {
          p_items: {
            variant_id: string;
            quantity: number;
            unit_price: number;
            discount: number;
          }[];
          p_paid_cash?: number;
          p_paid_card?: number;
          p_paid_transfer?: number;
          p_notes?: string | null;
        };
        Returns: {
          sale_id: string;
          folio: string;
          total: number;
        };
      };
    };
    Enums: {
      product_kind: "consignment" | "own" | "ticket" | "service";
      payment_method: "cash" | "card" | "transfer" | "mixed";
      sale_status: "pending" | "completed" | "cancelled" | "refunded";
      movement_type: "sale" | "brand_payment" | "floor_income" | "salary" | "rent" | "maintenance" | "savings" | "debt_payment" | "construction" | "production_reimbursement" | "event_income" | "deposit" | "withdrawal" | "adjustment";
      payout_status: "pending" | "paid" | "partial";
    };
  };
};
