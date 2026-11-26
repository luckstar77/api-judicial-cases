export interface UserVO {
  uid: string;
  phone: string;
  ip?: string;
  name?: string;
  email?: string;
  displayName?: string;
}

export interface UserCredentialVO extends UserVO {
  passwordHash?: string;
}

export interface UpsertPhoneUserInput {
  uid: string;
  phone: string;
  ip: string;
}

export interface RegisterUserInput {
  uid: string;
  phone: string;
  ip: string;
  passwordHash: string;
  name: string;
  displayName: string;
  email: string;
}

export interface UpdateUserProfileInput {
  displayName?: string;
  email?: string;
  passwordHash?: string;
}
