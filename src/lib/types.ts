export type Role = "pending" | "member" | "captain" | "exec";

export type Profile = {
  id: string;
  email: string;
  full_name: string | null;
  role: Role;
  tier: string | null;
  title: string | null;
  created_at: string;
  updated_at: string;
};

export type Practice = {
  id: string;
  external_uid: string;
  title: string;
  location: string | null;
  starts_at: string;
  ends_at: string;
  roster_group: string | null;
  created_at: string;
  updated_at: string;
};

export type CalendarSettings = {
  id: string;
  ical_url: string;
  last_synced_at: string | null;
  last_sync_error: string | null;
  updated_by: string | null;
  updated_at: string;
};
