/**
 * DI container tokens for type-safe injection
 */

export const TYPES = {
  // Repositories
  IUserRepository: Symbol('IUserRepository'),
  IOrgRepository: Symbol('IOrgRepository'),
  IPostRepository: Symbol('IPostRepository'),
  ICommentRepository: Symbol('ICommentRepository'),
  ILikeRepository: Symbol('ILikeRepository'),
  IAppSettingRepository: Symbol('IAppSettingRepository'),
  IOrgUserRepository: Symbol('IOrgUserRepository'),
  IOrgUserRoleRepository: Symbol('IOrgUserRoleRepository'),
  IRoleRepository: Symbol('IRoleRepository'),
  ISuperAdminRepository: Symbol('ISuperAdminRepository'),
  IAttachmentRepository: Symbol('IAttachmentRepository'),
  IOrgFileRepository: Symbol('IOrgFileRepository'),
  ICollectionRepository: Symbol('ICollectionRepository'),
  ICollectionFieldRepository: Symbol('ICollectionFieldRepository'),
  IRecordRepository: Symbol('IRecordRepository'),
  IJoinCodeRepository: Symbol('IJoinCodeRepository'),
  IJoinRequestRepository: Symbol('IJoinRequestRepository'),
  ITeamRepository: Symbol('ITeamRepository'),
  ITeamMemberRepository: Symbol('ITeamMemberRepository'),
  INotificationRepository: Symbol('INotificationRepository'),

  // Services
  IPasswordHasherService: Symbol('IPasswordHasherService'),
  ITokenService: Symbol('ITokenService'),
  IFileStorageService: Symbol('IFileStorageService'),

  // Use Cases
  IAuthUseCase: Symbol('IAuthUseCase'),
  IOrgUseCase: Symbol('IOrgUseCase'),
  IPostUseCase: Symbol('IPostUseCase'),
  ICommentUseCase: Symbol('ICommentUseCase'),
  ILikeUseCase: Symbol('ILikeUseCase'),
  IAttachmentUseCase: Symbol('IAttachmentUseCase'),
  IOrgFileUseCase: Symbol('IOrgFileUseCase'),
  ICollectionUseCase: Symbol('ICollectionUseCase'),
  IRecordUseCase: Symbol('IRecordUseCase'),
  IJoinRequestUseCase: Symbol('IJoinRequestUseCase'),
  ITeamUseCase: Symbol('ITeamUseCase'),
  INotificationUseCase: Symbol('INotificationUseCase'),
} as const;

