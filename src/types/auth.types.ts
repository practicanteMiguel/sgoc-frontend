export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
}
export interface AuthUser {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  position: string;
  module: string | null;
  field: string | null;
  roles: string[];
  is_first_login: boolean;
}
