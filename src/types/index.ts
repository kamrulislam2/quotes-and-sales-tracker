export interface Profile {
  id: string;
  username: string;
  role: 'admin' | 'user';
  full_name?: string | null;
  allowed_types: string[];
  has_changed_password: boolean;
  created_at: string;
}

export type FileType = 'Quote' | 'Requote' | 'Requote Van' | 'Requote Bike' | 'Review' | 'Review Van' | 'Review Bike' | 'Individual Review' | 'Other Site' | 'Van' | 'Bike' | 'Sale';

export interface RecordItem {
  id: string;
  user_id: string;
  file_name: string;
  branch_name: string;
  codename: string;
  file_type: FileType;
  submitted_at: string;
  created_at: string;
  profiles?: {
    username: string;
    full_name: string | null;
  } | null;
}

export interface AuditLogItem {
  id: string;
  actor_id: string | null;
  actor_codename: string;
  action_type: string;
  target_id: string | null;
  details: string;
  created_at: string;
}
