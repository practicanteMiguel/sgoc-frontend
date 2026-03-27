export interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  phone: string | null;
  position: string;
  module: string | null;
  field: string | null;
  is_active: boolean;
  is_email_verified: boolean;
  is_first_login: boolean;
  last_login_at: string | null;
  password_changed_at: string | null;
  created_at: string;
  user_roles: UserRole[];
}
export interface UserRole {
  id: string;
  role: Role;
}


export interface Role {
  id:          string;
  name:        string;
  slug:        string;
  description: string | null;
  is_active:   boolean;
  is_system:   boolean;
  role_permissions: { permission: Permission }[];
}

export interface Permission {
  id:     string;
  name:   string;
  slug:   string;
  module: string;
  action: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}
