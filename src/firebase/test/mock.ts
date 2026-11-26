import { InvalidFirebaseTokenError, VerifiedPhoneIdentity } from '../firebase.service';

/** 測試用 Firebase：token 格式為 `valid:<uid>:<phone>`，其餘一律視為無效 */
export const mockFirebaseService = {
  onModuleInit: jest.fn(),
  verifyPhoneToken: jest.fn(async (idToken: string): Promise<VerifiedPhoneIdentity> => {
    const [prefix, uid, phone] = idToken.split(':');
    if (prefix !== 'valid' || !uid || !phone) throw new InvalidFirebaseTokenError('invalid token');
    return { uid, phone };
  }),
};

export function fakeFirebaseToken(uid: string, phone: string): string {
  return `valid:${uid}:${phone}`;
}
