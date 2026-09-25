export interface RoleResponse {
  id: number;
  name: string;
  description?: string;
}

export interface UserResponse {
  email: string;
  full_name: string;
  id: number;
  is_active: boolean;
  roles: RoleResponse[];
}

export interface Token {
  access_token: string;
  token_type: string;
}

export interface LoginResponse {
  token: Token;
  user: UserResponse;
}

export interface UserLogin {
  email: string;
  password: string;
}
