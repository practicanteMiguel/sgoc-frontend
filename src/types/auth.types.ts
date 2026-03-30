export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  access_token: string;
  refresh_token: string;
  user: AuthUser;
}
export interface AuthUser {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  position: string;
  phone: string | undefined;
  module: string | null;
  field: string | null;
  roles: string[];
  is_first_login: boolean;
}
