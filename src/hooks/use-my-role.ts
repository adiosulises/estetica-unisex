"use client";

import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";

export function useMyRole() {
  return useQuery({
    queryKey: ["my-role"],
    queryFn: async (): Promise<string> => {
      const supabase = createClient();
      const { data, error } = await supabase.rpc("my_role");
      if (error) throw error;
      return (data as string) ?? "employee";
    },
    staleTime: 5 * 60_000, // role changes are rare
  });
}
