import { injectable, inject } from 'tsyringe';
import { container } from '../../core/di/container';
import { Result } from '../../core/result/Result';
import { NotFoundError, ConflictError, ForbiddenError } from '../../core/errors/AppError';
import { IOrgRepository } from '../interfaces/IOrgRepository';
import { IOrgUserRepository } from '../interfaces/IOrgUserRepository';
import { IRoleRepository } from '../interfaces/IRoleRepository';
import { IOrgUserRoleRepository } from '../interfaces/IOrgUserRoleRepository';
import { IJoinCodeRepository } from '../interfaces/IJoinCodeRepository';
import { IJoinRequestRepository } from '../interfaces/IJoinRequestRepository';
import { ITeamMemberRepository } from '../interfaces/ITeamMemberRepository';
import { INotificationRepository } from '../interfaces/INotificationRepository';
import { ISuperAdminRepository } from '../interfaces/ISuperAdminRepository';
import { Org } from '../../domain/entities/Org';
import { TYPES } from '../../core/di/types';

export interface IOrgUseCase {
  create(
    name: string,
    slug: string,
    description?: string,
    creatorUserId?: string
  ): Promise<Result<Org, Error>>;
  findById(id: string): Promise<Result<Org, Error>>;
  findByUserId(userId: string): Promise<Result<Org[], Error>>;
  update(
    id: string,
    updates: { name?: string; description?: string }
  ): Promise<Result<Org, Error>>;
  delete(id: string): Promise<Result<void, Error>>;
  generateJoinCode(orgId: string): Promise<Result<Org, Error>>;
  updateJoinCodeSettings(
    orgId: string,
    settings: {
      isActive?: boolean;
      maxUses?: number | null;
      allowedDomains?: string[] | null;
      expiresAt?: Date | null;
      defaultRoleId?: number | null;
    }
  ): Promise<Result<Org, Error>>;
  joinWithCode(joinCode: string, userId: string, userEmail: string): Promise<Result<Org, Error>>;
}

@injectable()
export class OrgUseCase implements IOrgUseCase {
  constructor(
    @inject(TYPES.IOrgRepository) private orgRepository: IOrgRepository,
    @inject(TYPES.IOrgUserRepository) private orgUserRepository: IOrgUserRepository,
    @inject(TYPES.IRoleRepository) private roleRepository: IRoleRepository,
    @inject(TYPES.IOrgUserRoleRepository) private orgUserRoleRepository: IOrgUserRoleRepository,
    @inject(TYPES.IJoinCodeRepository) private joinCodeRepository: IJoinCodeRepository,
    @inject(TYPES.IJoinRequestRepository) private joinRequestRepository: IJoinRequestRepository,
    @inject(TYPES.ITeamMemberRepository) private teamMemberRepository: ITeamMemberRepository,
    @inject(TYPES.INotificationRepository) private notificationRepository: INotificationRepository
  ) {}

  async create(
    name: string,
    slug: string,
    description?: string,
    creatorUserId?: string
  ): Promise<Result<Org, Error>> {
    // Check if slug exists
    const existing = await this.orgRepository.findBySlug(slug);
    if (existing) {
      return Result.err(new ConflictError(`Organization with slug "${slug}" already exists`));
    }

    // Check max organizations per user limit
    if (creatorUserId) {
      const userOrgs = await this.orgRepository.findByUserId(creatorUserId);
      const maxOrgsPerUser = parseInt(process.env.MAX_ORGS_PER_USER || '1', 10);
      
      // Check if user is superadmin (superadmins can have more orgs)
      const superAdminRepo = container.resolve<ISuperAdminRepository>(TYPES.ISuperAdminRepository);
      const superAdmin = await superAdminRepo.findByUserId(creatorUserId);
      const isSuperAdmin = superAdmin !== null && superAdmin.isActive;

      // If not superadmin and at limit, return error
      if (!isSuperAdmin && userOrgs.length >= maxOrgsPerUser) {
        return Result.err(
          new ForbiddenError(
            `Maximum ${maxOrgsPerUser} organization${maxOrgsPerUser !== 1 ? 's' : ''} allowed per user`
          )
        );
      }
    }

    const org = await this.orgRepository.create({
      name,
      slug,
      description: description || null,
      isActive: true,
    });

    // Create OrgUser with Admin role for creatorUserId
    if (creatorUserId) {
      // Create OrgUser record
      const orgUser = await this.orgUserRepository.create({
        orgId: org.id,
        userId: creatorUserId,
        isActive: true,
      });

      // Get Admin role (id = 1 from seed)
      const adminRole = await this.roleRepository.findById(1);
      if (!adminRole) {
        // If Admin role doesn't exist, skip role assignment (should not happen if seed ran)
        return Result.ok(org);
      }

      // Create OrgUserRole record
      await this.orgUserRoleRepository.create({
        orgUserId: orgUser.id,
        roleId: adminRole.id,
      });
    }

    return Result.ok(org);
  }

  async findById(id: string): Promise<Result<Org, Error>> {
    const org = await this.orgRepository.findById(id);

    if (!org) {
      return Result.err(new NotFoundError('Organization', id));
    }

    return Result.ok(org);
  }

  async findByUserId(userId: string): Promise<Result<Org[], Error>> {
    const orgs = await this.orgRepository.findByUserId(userId);

    return Result.ok(orgs);
  }

  async update(
    id: string,
    updates: { name?: string; description?: string }
  ): Promise<Result<Org, Error>> {
    const org = await this.orgRepository.findById(id);

    if (!org) {
      return Result.err(new NotFoundError('Organization', id));
    }

    const updated = await this.orgRepository.update(id, updates);

    return Result.ok(updated);
  }

  async delete(id: string): Promise<Result<void, Error>> {
    const org = await this.orgRepository.findById(id);

    if (!org) {
      return Result.err(new NotFoundError('Organization', id));
    }

    await this.orgRepository.delete(id);

    return Result.ok(undefined);
  }

  async generateJoinCode(orgId: string): Promise<Result<Org, Error>> {
    const org = await this.orgRepository.findById(orgId);

    if (!org) {
      return Result.err(new NotFoundError('Organization', orgId));
    }

    // Check if join code already exists
    const existing = await this.joinCodeRepository.findByOrgId(orgId);
    if (existing) {
      // Delete old one
      await this.joinCodeRepository.delete(existing.id);
    }

    // Generate a unique join code: ORG-XXXXXX (6 random alphanumeric)
    const generateCode = (): string => {
      const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Exclude confusing chars
      let code = 'ORG-';
      for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      return code;
    };

    let code = generateCode();
    // Ensure uniqueness
    let codeExists = await this.joinCodeRepository.findByCode(code);
    let attempts = 0;
    while (codeExists && attempts < 10) {
      code = generateCode();
      codeExists = await this.joinCodeRepository.findByCode(code);
      attempts++;
    }

    if (codeExists) {
      return Result.err(new ConflictError('Failed to generate unique join code. Please try again.'));
    }

    // Create new join code
    await this.joinCodeRepository.create({
      orgId,
      code,
      maxUses: null,
      usedCount: 0,
      allowedDomains: null,
      isActive: false,
      expiresAt: null,
      defaultRoleId: 2, // Default to Member
      defaultTeamId: null,
      requiresApproval: false,
      welcomeMessage: null,
      visibility: 'private',
      notifyAdminsOnJoin: true,
    });

    return Result.ok(org);
  }

  async updateJoinCodeSettings(
    orgId: string,
    settings: {
      isActive?: boolean;
      maxUses?: number | null;
      allowedDomains?: string[] | null;
      expiresAt?: Date | null;
      defaultRoleId?: number | null;
      defaultTeamId?: string | null;
      requiresApproval?: boolean;
      welcomeMessage?: string | null;
      visibility?: 'private' | 'public';
      notifyAdminsOnJoin?: boolean;
    }
  ): Promise<Result<Org, Error>> {
    const org = await this.orgRepository.findById(orgId);

    if (!org) {
      return Result.err(new NotFoundError('Organization', orgId));
    }

    const joinCode = await this.joinCodeRepository.findByOrgId(orgId);
    if (!joinCode) {
      return Result.err(new NotFoundError('Join code', orgId));
    }

    const updates: any = {};
    if (settings.isActive !== undefined) updates.isActive = settings.isActive;
    if (settings.maxUses !== undefined) updates.maxUses = settings.maxUses;
    if (settings.allowedDomains !== undefined) updates.allowedDomains = settings.allowedDomains;
    if (settings.expiresAt !== undefined) updates.expiresAt = settings.expiresAt;
    if (settings.defaultRoleId !== undefined) updates.defaultRoleId = settings.defaultRoleId;
    if (settings.defaultTeamId !== undefined) updates.defaultTeamId = settings.defaultTeamId;
    if (settings.requiresApproval !== undefined) updates.requiresApproval = settings.requiresApproval;
    if (settings.welcomeMessage !== undefined) updates.welcomeMessage = settings.welcomeMessage;
    if (settings.visibility !== undefined) updates.visibility = settings.visibility;
    if (settings.notifyAdminsOnJoin !== undefined) updates.notifyAdminsOnJoin = settings.notifyAdminsOnJoin;

    await this.joinCodeRepository.update(joinCode.id, updates);

    return Result.ok(org);
  }

  async joinWithCode(joinCode: string, userId: string, userEmail: string): Promise<Result<Org, Error>> {
    const code = await this.joinCodeRepository.findByCode(joinCode);

    if (!code) {
      return Result.err(new NotFoundError('Join code', joinCode));
    }

    const org = await this.orgRepository.findById(code.orgId);
    if (!org) {
      return Result.err(new NotFoundError('Organization', code.orgId));
    }

    // Check if join code is active
    if (!code.isActive) {
      return Result.err(new ConflictError('This join code is not active'));
    }

    // Check if expired
    if (code.expiresAt && new Date(code.expiresAt) < new Date()) {
      return Result.err(new ConflictError('This join code has expired'));
    }

    // Check if max uses reached
    if (code.maxUses !== null && code.usedCount >= code.maxUses) {
      return Result.err(new ConflictError('This join code has reached its maximum uses'));
    }

    // Check domain restrictions
    if (code.allowedDomains && code.allowedDomains.length > 0) {
      const userDomain = userEmail.split('@')[1]?.toLowerCase();
      if (!userDomain || !code.allowedDomains.includes(userDomain)) {
        return Result.err(
          new ConflictError(
            `Your email domain is not allowed. Allowed domains: ${code.allowedDomains.join(', ')}`
          )
        );
      }
    }

    // Check if user is already a member
    const existingOrgUser = await this.orgUserRepository.findByOrgIdAndUserId(org.id, userId);
    if (existingOrgUser) {
      return Result.err(new ConflictError('You are already a member of this organization'));
    }

    // Check if there's a pending request
    const pendingRequest = await this.joinRequestRepository.findPendingByOrgIdAndUserId(org.id, userId);
    if (pendingRequest) {
      return Result.err(new ConflictError('You already have a pending join request for this organization'));
    }

    // If requires approval, create join request instead
    if (code.requiresApproval) {
      await this.joinRequestRepository.create({
        orgId: org.id,
        userId,
        joinCodeId: code.id,
        status: 'pending',
        message: null,
        reviewedByUserId: null,
        rejectionReason: null,
      });

      // Notify admins if enabled
      if (code.notifyAdminsOnJoin) {
        // Get org admins
        const orgUsers = await this.orgUserRepository.findByOrgId(org.id);
        for (const orgUser of orgUsers) {
          const roles = await this.orgUserRoleRepository.findByOrgUserId(orgUser.id);
          const roleIds = roles.map((r) => r.roleId);
          const adminRole = await this.roleRepository.findById(1); // Admin role id = 1
          if (adminRole && roleIds.includes(adminRole.id)) {
            await this.notificationRepository.create({
              userId: orgUser.userId,
              type: 'join_request',
              title: 'New Join Request',
              message: `A user has requested to join ${org.name}`,
              relatedEntityType: 'join_request',
              relatedEntityId: null, // Will be set after request is created
              isRead: false,
              readAt: null,
            });
          }
        }
      }

      return Result.ok(org);
    }

    // Auto-approve: Create OrgUser
    const orgUser = await this.orgUserRepository.create({
      orgId: org.id,
      userId,
      isActive: true,
    });

    // Assign default role (or Member if not set)
    const roleId = code.defaultRoleId || 2; // Default to Member (id: 2)
    const role = await this.roleRepository.findById(roleId);
    if (role) {
      await this.orgUserRoleRepository.create({
        orgUserId: orgUser.id,
        roleId: role.id,
      });
    }

    // Assign to default team if specified
    if (code.defaultTeamId) {
      await this.teamMemberRepository.create({
        teamId: code.defaultTeamId,
        userId,
        role: 'member',
      });
    }

    // Increment usage count
    await this.joinCodeRepository.update(code.id, {
      usedCount: code.usedCount + 1,
    });

    // Notify admins if enabled
    if (code.notifyAdminsOnJoin) {
      const orgUsers = await this.orgUserRepository.findByOrgId(org.id);
      for (const orgUser of orgUsers) {
        const roles = await this.orgUserRoleRepository.findByOrgUserId(orgUser.id);
        const roleIds = roles.map((r) => r.roleId);
        const adminRole = await this.roleRepository.findById(1);
        if (adminRole && roleIds.includes(adminRole.id)) {
          await this.notificationRepository.create({
            userId: orgUser.userId,
            type: 'member_joined',
            title: 'New Member Joined',
            message: `A new member has joined ${org.name}`,
            relatedEntityType: 'org',
            relatedEntityId: org.id,
            isRead: false,
            readAt: null,
          });
        }
      }
    }

    return Result.ok(org);
  }
}

