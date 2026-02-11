import express, { Express } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import * as dotenv from 'dotenv';
import { container } from '../core/di/container';
import { TYPES } from '../core/di/types';
import { errorMiddleware } from './middleware/errorMiddleware';
import { apiRateLimit } from './middleware/rateLimitMiddleware';

// Routes
import authRoutes from './routes/auth.routes';
import orgsRoutes from './routes/orgs.routes';
import postsRoutes from './routes/posts.routes';
import commentsRoutes from './routes/comments.routes';
import likesRoutes from './routes/likes.routes';
import attachmentsRoutes from './routes/attachments.routes';
import membersRoutes from './routes/members.routes';
import healthRoutes from './routes/health.routes';

// Register services in DI container
import '../core/di/container';
import { IUserRepository } from '../application/interfaces/IUserRepository';
import { UserRepository } from '../infrastructure/persistence/UserRepository';
import { IOrgRepository } from '../application/interfaces/IOrgRepository';
import { OrgRepository } from '../infrastructure/persistence/OrgRepository';
import { IPostRepository } from '../application/interfaces/IPostRepository';
import { PostRepository } from '../infrastructure/persistence/PostRepository';
import { ICommentRepository } from '../application/interfaces/ICommentRepository';
import { CommentRepository } from '../infrastructure/persistence/CommentRepository';
import { ILikeRepository } from '../application/interfaces/ILikeRepository';
import { LikeRepository } from '../infrastructure/persistence/LikeRepository';
import { IAppSettingRepository } from '../application/interfaces/IAppSettingRepository';
import { AppSettingRepository } from '../infrastructure/persistence/AppSettingRepository';
import { IPasswordHasherService } from '../infrastructure/services/PasswordHasherService';
import { PasswordHasherService } from '../infrastructure/services/PasswordHasherService';
import { ITokenService } from '../infrastructure/services/TokenService';
import { TokenService } from '../infrastructure/services/TokenService';
import { IAuthUseCase } from '../application/use-cases/AuthUseCase';
import { AuthUseCase } from '../application/use-cases/AuthUseCase';
import { IOrgUseCase } from '../application/use-cases/OrgUseCase';
import { OrgUseCase } from '../application/use-cases/OrgUseCase';
import { IPostUseCase } from '../application/use-cases/PostUseCase';
import { PostUseCase } from '../application/use-cases/PostUseCase';
import { ICommentUseCase } from '../application/use-cases/CommentUseCase';
import { CommentUseCase } from '../application/use-cases/CommentUseCase';
import { ILikeUseCase } from '../application/use-cases/LikeUseCase';
import { LikeUseCase } from '../application/use-cases/LikeUseCase';
import { IAttachmentUseCase } from '../application/use-cases/AttachmentUseCase';
import { AttachmentUseCase } from '../application/use-cases/AttachmentUseCase';
import { IAttachmentRepository } from '../application/interfaces/IAttachmentRepository';
import { AttachmentRepository } from '../infrastructure/persistence/AttachmentRepository';
import { IOrgFileRepository } from '../application/interfaces/IOrgFileRepository';
import { OrgFileRepository } from '../infrastructure/persistence/OrgFileRepository';
import { IOrgFileUseCase } from '../application/use-cases/OrgFileUseCase';
import { OrgFileUseCase } from '../application/use-cases/OrgFileUseCase';
import { IFileStorageService } from '../application/interfaces/IFileStorageService';
import { StorageBackendFactory } from '../infrastructure/services/StorageBackendFactory';
import { IOrgUserRepository } from '../application/interfaces/IOrgUserRepository';
import { OrgUserRepository } from '../infrastructure/persistence/OrgUserRepository';
import { IRoleRepository } from '../application/interfaces/IRoleRepository';
import { RoleRepository } from '../infrastructure/persistence/RoleRepository';
import { IOrgUserRoleRepository } from '../application/interfaces/IOrgUserRoleRepository';
import { OrgUserRoleRepository } from '../infrastructure/persistence/OrgUserRoleRepository';
import { ICollectionRepository } from '../application/interfaces/ICollectionRepository';
import { CollectionRepository } from '../infrastructure/persistence/CollectionRepository';
import { ICollectionFieldRepository } from '../application/interfaces/ICollectionFieldRepository';
import { CollectionFieldRepository } from '../infrastructure/persistence/CollectionFieldRepository';
import { IRecordRepository } from '../application/interfaces/IRecordRepository';
import { RecordRepository } from '../infrastructure/persistence/RecordRepository';
import { ICollectionUseCase } from '../application/use-cases/CollectionUseCase';
import { CollectionUseCase } from '../application/use-cases/CollectionUseCase';
import { IRecordUseCase } from '../application/use-cases/RecordUseCase';
import { RecordUseCase } from '../application/use-cases/RecordUseCase';
import { IJoinRequestUseCase } from '../application/use-cases/JoinRequestUseCase';
import { JoinRequestUseCase } from '../application/use-cases/JoinRequestUseCase';
import { ITeamUseCase } from '../application/use-cases/TeamUseCase';
import { TeamUseCase } from '../application/use-cases/TeamUseCase';
import { INotificationUseCase } from '../application/use-cases/NotificationUseCase';
import { NotificationUseCase } from '../application/use-cases/NotificationUseCase';
import { JoinCodeRepository } from '../infrastructure/persistence/JoinCodeRepository';
import { JoinRequestRepository } from '../infrastructure/persistence/JoinRequestRepository';
import { TeamRepository } from '../infrastructure/persistence/TeamRepository';
import { TeamMemberRepository } from '../infrastructure/persistence/TeamMemberRepository';
import { NotificationRepository } from '../infrastructure/persistence/NotificationRepository';
import { IJoinCodeRepository } from '../application/interfaces/IJoinCodeRepository';
import { IJoinRequestRepository } from '../application/interfaces/IJoinRequestRepository';
import { ITeamRepository } from '../application/interfaces/ITeamRepository';
import { ITeamMemberRepository } from '../application/interfaces/ITeamMemberRepository';
import { INotificationRepository } from '../application/interfaces/INotificationRepository';
import { ISuperAdminRepository } from '../application/interfaces/ISuperAdminRepository';
import { SuperAdminRepository } from '../infrastructure/persistence/SuperAdminRepository';

dotenv.config();

// Register all dependencies
container.registerSingleton<IUserRepository>(TYPES.IUserRepository, UserRepository);
container.registerSingleton<IOrgRepository>(TYPES.IOrgRepository, OrgRepository);
container.registerSingleton<IPostRepository>(TYPES.IPostRepository, PostRepository);
container.registerSingleton<ICommentRepository>(TYPES.ICommentRepository, CommentRepository);
container.registerSingleton<ILikeRepository>(TYPES.ILikeRepository, LikeRepository);
container.registerSingleton<IAppSettingRepository>(TYPES.IAppSettingRepository, AppSettingRepository);
container.registerSingleton<IOrgUserRepository>(TYPES.IOrgUserRepository, OrgUserRepository);
container.registerSingleton<IRoleRepository>(TYPES.IRoleRepository, RoleRepository);
container.registerSingleton<IOrgUserRoleRepository>(TYPES.IOrgUserRoleRepository, OrgUserRoleRepository);
container.registerSingleton<ISuperAdminRepository>(TYPES.ISuperAdminRepository, SuperAdminRepository);
container.registerSingleton<IPasswordHasherService>(TYPES.IPasswordHasherService, PasswordHasherService);
container.registerSingleton<ITokenService>(TYPES.ITokenService, TokenService);
container.registerSingleton<IAuthUseCase>(TYPES.IAuthUseCase, AuthUseCase);
container.registerSingleton<IOrgUseCase>(TYPES.IOrgUseCase, OrgUseCase);
container.registerSingleton<IPostUseCase>(TYPES.IPostUseCase, PostUseCase);
container.registerSingleton<ICommentUseCase>(TYPES.ICommentUseCase, CommentUseCase);
container.registerSingleton<ILikeUseCase>(TYPES.ILikeUseCase, LikeUseCase);
container.registerSingleton<IAttachmentRepository>(TYPES.IAttachmentRepository, AttachmentRepository);
container.registerSingleton<IAttachmentUseCase>(TYPES.IAttachmentUseCase, AttachmentUseCase);
container.registerSingleton<IOrgFileRepository>(TYPES.IOrgFileRepository, OrgFileRepository);
container.registerSingleton<IOrgFileUseCase>(TYPES.IOrgFileUseCase, OrgFileUseCase);
container.registerSingleton<ICollectionRepository>(TYPES.ICollectionRepository, CollectionRepository);
container.registerSingleton<ICollectionFieldRepository>(TYPES.ICollectionFieldRepository, CollectionFieldRepository);
container.registerSingleton<IRecordRepository>(TYPES.IRecordRepository, RecordRepository);
container.registerSingleton<ICollectionUseCase>(TYPES.ICollectionUseCase, CollectionUseCase);
container.registerSingleton<IRecordUseCase>(TYPES.IRecordUseCase, RecordUseCase);
container.registerSingleton<IJoinCodeRepository>(TYPES.IJoinCodeRepository, JoinCodeRepository);
container.registerSingleton<IJoinRequestRepository>(TYPES.IJoinRequestRepository, JoinRequestRepository);
container.registerSingleton<ITeamRepository>(TYPES.ITeamRepository, TeamRepository);
container.registerSingleton<ITeamMemberRepository>(TYPES.ITeamMemberRepository, TeamMemberRepository);
container.registerSingleton<INotificationRepository>(TYPES.INotificationRepository, NotificationRepository);
container.registerSingleton<IJoinRequestUseCase>(TYPES.IJoinRequestUseCase, JoinRequestUseCase);
container.registerSingleton<ITeamUseCase>(TYPES.ITeamUseCase, TeamUseCase);
container.registerSingleton<INotificationUseCase>(TYPES.INotificationUseCase, NotificationUseCase);

container.register<IFileStorageService>(TYPES.IFileStorageService, {
  useFactory: () => StorageBackendFactory.create(),
});

export function createApp(): Express {
  const app = express();

  // Trust proxy - required for Render and other hosting platforms behind proxies
  // This ensures correct IP addresses and secure cookie handling
  app.set('trust proxy', 1);

  // CORS configuration
  const allowedOrigins = [
    process.env.FRONTEND_URL || 'http://localhost:3000',
    'http://localhost:3000',
  ]
    .filter(Boolean)
    .filter((value, index, self) => self.indexOf(value) === index);

  // Additional allowed domains from environment (comma-separated)
  const additionalDomains = process.env.ALLOWED_DOMAINS
    ? process.env.ALLOWED_DOMAINS.split(',').map(d => d.trim()).filter(Boolean)
    : [];

  console.log('[Server] CORS allowed origins:', allowedOrigins);
  console.log('[Server] CORS allowed domains:', additionalDomains);
  console.log('[Server] NODE_ENV:', process.env.NODE_ENV);

  app.use(cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (server-side requests, SSR, mobile apps, curl)
      if (!origin) {
        return callback(null, true);
      }
      
      // Check if origin is in allowed list
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      
      // Check if origin matches allowed domains from environment
      try {
        const originUrl = new URL(origin);
        const allowedHostnames = [
          'localhost',
          ...additionalDomains,
        ];
        if (allowedHostnames.includes(originUrl.hostname)) {
          return callback(null, true);
        }
      } catch (e) {
        console.error('[CORS] Error parsing origin URL:', e);
      }
      
      console.error('[CORS] ❌ Origin not allowed:', origin);
      callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
  }));
  app.use(express.json());
  app.use(cookieParser());
  app.use(apiRateLimit);

  // Root route
  app.get('/', (_req, res) => {
    res.json({
      name: 'AtomicFuel API',
      type: 'Backend Engine',
      version: '0.9',
      status: 'running',
      endpoints: {
        health: '/health',
        auth: '/api/auth',
        orgs: '/api/orgs',
        posts: '/api/orgs/:orgId/posts',
        comments: '/api/orgs/:orgId/posts/:postId/comments',
        likes: '/api/orgs/:orgId/posts/:postId/likes',
        attachments: '/api/orgs/:orgId/posts/:postId/attachments',
        members: '/api/orgs/:orgId/members',
      },
    });
  });

  // Health check
  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // API routes
  app.use('/api/health', healthRoutes);
  app.use('/api/auth', authRoutes);
  app.use('/api/orgs', orgsRoutes);
  app.use('/api/orgs/:orgId/posts', postsRoutes);
  app.use('/api/orgs/:orgId/posts/:postId/comments', commentsRoutes);
  app.use('/api/orgs/:orgId/posts/:postId/likes', likesRoutes);
  app.use('/api/orgs/:orgId/posts/:postId/attachments', attachmentsRoutes);
  app.use('/api/orgs/:orgId/members', membersRoutes);

  // Error handling (must be last)
  app.use(errorMiddleware);

  return app;
}

