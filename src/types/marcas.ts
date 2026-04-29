export type ContractType = "pct" | "floor";

export interface Marca {
  id: string;
  name: string;
  sku_prefix: string | null;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  bank_account: string | null;
  contract_type: ContractType;
  contract_value: number;
  notes: string | null;
  is_active: boolean;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}
