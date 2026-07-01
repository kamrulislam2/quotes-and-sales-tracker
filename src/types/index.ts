export interface Profile {
  id: string;
  username: string;
  role: 'admin' | 'user';
  full_name?: string | null;
  allowed_types: string[];
  has_changed_password: boolean;
  can_manage_rules?: boolean;
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

export interface ComplianceRule {
  id: string;
  category: 'announcement' | 'fine' | 'universal' | 'company';
  sub_category: 'nby_rule' | 'general_pricing' | 'employment' | 'driver_and_usage' | 'license_and_residency' | 'file_processing' | 'branch_priority' | 'doc_extensions' | 'common_rules';
  company_name: string | null;
  company_tags: string[] | null;
  title: string | null;
  content: string;
  extra_info: string | null;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
  updated_by: string | null;
  profiles?: {
    username: string;
    full_name: string | null;
  } | null;
}

export interface RuleHistory {
  id: string;
  rule_id: string;
  category: string;
  sub_category: string;
  company_name: string | null;
  company_tags: string[] | null;
  title: string | null;
  content: string;
  extra_info: string | null;
  action_type: 'INSERT' | 'UPDATE' | 'DELETE';
  archived_at: string;
  archived_by: string | null;
  profiles?: {
    username: string;
    full_name: string | null;
  } | null;
}

export interface SavedDocument {
  id: string;
  filename: string;
  filePath: string;
  htmlContent: string;
  recordId: string;
  savedAt: string;
}

export interface LoginCode {
  login_id: string;
  code: string;
  name?: string | null;
  updated_at?: string;
}

export interface TodoItem {
  id: string;
  user_id: string;
  codename: string;
  task: string;
  status: 'Working' | 'Completed';
  comment?: string | null;
  todo_date: string; // Format: 'YYYY-MM-DD'
  is_all_time: boolean;
  created_at: string;
}

