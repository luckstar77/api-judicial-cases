/** Unit test 專用：取代 DatabaseService，不連線資料庫 */
export function createMockDatabaseService() {
  return {
    ping: jest.fn(),
    userRepository: {
      findByUid: jest.fn(),
      findTokenVersion: jest.fn(),
      findCredentialByPhone: jest.fn(),
      findCredentialByUid: jest.fn(),
      hasPasswordForPhone: jest.fn(),
      upsertPhoneUser: jest.fn(),
      completeRegistration: jest.fn(),
      insertRegisteredUser: jest.fn(),
      updateProfile: jest.fn(),
      updatePasswordHash: jest.fn(),
      count: jest.fn(),
    },
    judgmentRepository: {
      searchByName: jest.fn(),
      findDetailById: jest.fn(),
      existsById: jest.fn(),
      findFullTextByName: jest.fn(),
      findWarningNames: jest.fn(),
      countByCity: jest.fn(),
      count: jest.fn(),
    },
    judgmentCommentRepository: { findByFilesetId: jest.fn(), findById: jest.fn(), create: jest.fn() },
    judgmentLikeRepository: { countByFilesetId: jest.fn(), exists: jest.fn(), toggle: jest.fn() },
    caseRepository: { findPage: jest.fn(), searchPage: jest.fn(), findById: jest.fn(), existsById: jest.fn(), create: jest.fn(), count: jest.fn() },
    caseCommentRepository: { findByCaseId: jest.fn(), findById: jest.fn(), create: jest.fn() },
    caseLikeRepository: { countByCaseId: jest.fn(), exists: jest.fn(), toggle: jest.fn() },
  };
}

export type MockDatabaseService = ReturnType<typeof createMockDatabaseService>;
