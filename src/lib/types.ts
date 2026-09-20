export type Role = "pending" | "member" | "captain" | "exec";

export type Profile = {
  id: string;
  email: string;
  full_name: string | null;
  role: Role;
  tier: string | null;
  created_at: string;
  updated_at: string;
};
