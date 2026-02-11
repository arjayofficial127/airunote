import { injectable, inject } from 'tsyringe';
import { Result } from '../../core/result/Result';
import { NotFoundError, ConflictError, ForbiddenError } from '../../core/errors/AppError';
import { IJoinRequestRepository } from '../interfaces/IJoinRequestRepository';
import { IOrgRepository } from '../interfaces/IOrgRepository';
import { IOrgUserRepository } from '../interfaces/IOrgUserRepository';
import { IOrgUserRoleRepository } from '../interfaces/IOrgUserRoleRepository';
import { IRoleRepository } from '../interfaces/IRoleRepository';
import { ITeamMemberRepository } from '../interfaces/ITeamMemberRepository';
import { IJoinCodeRepository } from '../interfaces/IJoinCodeRepository';
import { JoinCode } from '../../domain/entities/JoinCode';
import { INotificationRepository } from '../interfaces/INotificationRepository';
import { JoinRequest } from '../../domain/entities/JoinRequest';
import { TYPES } from '../../core/di/types';

export interface IJoinRequestUseCase {
  approve(requestId: string, reviewerUserId: string): Promise<Result<JoinRequest, Error>>;
  reject(requestId: string, reviewerUserId: string, reason?: string): Promise<Result<JoinRequest, Error>>;
  listPending(orgId: string): Promise<Result<JoinRequest[], Error>>;
}

@injectable()
export class JoinRequestUseCase implements IJoinRequestUseCase {
  constructor(
    @inject(TYPES.IJoinRequestRepository) private joinRequestRepository: IJoinRequestRepository,
    @inject(TYPES.IOrgRepository) private orgRepository: IOrgRepository,
    @inject(TYPES.IOrgUserRepository) private orgUserRepository: IOrgUserRepository,
    @inject(TYPES.IOrgUserRoleRepository) private orgUserRoleRepository: IOrgUserRoleRepository,
    @inject(TYPES.IRoleRepository) private roleRepository: IRoleRepository,
    @inject(TYPES.ITeamMemberRepository) private teamMemberRepository: ITeamMemberRepository,
    @inject(TYPES.IJoinCodeRepository) private joinCodeRepository: IJoinCodeRepository,
    @inject(TYPES.INotificationRepository) private notificationRepository: INotificationRepository
  ) {}

  async approve(requestId: string, reviewerUserId: string): Promise<Result<JoinRequest, Error>> {
    const request = await this.joinRequestRepository.findById(requestId);
    if (!request) {
      return Result.err(new NotFoundError('Join request', requestId));
    }

    if (request.status !== 'pending') {
      return Result.err(new ConflictError('This join request has already been processed'));
    }

    const org = await this.orgRepository.findById(request.orgId);
    if (!org) {
      return Result.err(new NotFoundError('Organization', request.orgId));
    }

    // Check if user is already a member
    const existingOrgUser = await this.orgUserRepository.findByOrgIdAndUserId(org.id, request.userId);
    if (existingOrgUser) {
      return Result.err(new ConflictError('User is already a member of this organization'));
    }

    // Get join code if exists
    let joinCode: JoinCode | null = null;
    if (request.joinCodeId) {
      joinCode = await this.joinCodeRepository.findById(request.joinCodeId);
    }

    // Create OrgUser
    const orgUser = await this.orgUserRepository.create({
      orgId: org.id,
      userId: request.userId,
      isActive: true,
    });

    // Assign default role
    const roleId = joinCode?.defaultRoleId || 2; // Default to Member
    const role = await this.roleRepository.findById(roleId);
    if (role) {
      await this.orgUserRoleRepository.create({
        orgUserId: orgUser.id,
        roleId: role.id,
      });
    }

    // Assign to default team if specified
    if (joinCode?.defaultTeamId) {
      await this.teamMemberRepository.create({
        teamId: joinCode.defaultTeamId,
        userId: request.userId,
        role: 'member',
      });
    }

    // Increment join code usage if exists
    if (joinCode) {
      await this.joinCodeRepository.update(joinCode.id, {
        usedCount: joinCode.usedCount + 1,
      });
    }

    // Update request status
    const updated = await this.joinRequestRepository.update(requestId, {
      status: 'approved',
      reviewedByUserId: reviewerUserId,
    });

    // Notify user
    await this.notificationRepository.create({
      userId: request.userId,
      type: 'join_approved',
      title: 'Join Request Approved',
      message: `Your request to join ${org.name} has been approved`,
      relatedEntityType: 'org',
      relatedEntityId: org.id,
      isRead: false,
      readAt: null,
    });

    return Result.ok(updated);
  }

  async reject(requestId: string, reviewerUserId: string, reason?: string): Promise<Result<JoinRequest, Error>> {
    const request = await this.joinRequestRepository.findById(requestId);
    if (!request) {
      return Result.err(new NotFoundError('Join request', requestId));
    }

    if (request.status !== 'pending') {
      return Result.err(new ConflictError('This join request has already been processed'));
    }

    const org = await this.orgRepository.findById(request.orgId);
    if (!org) {
      return Result.err(new NotFoundError('Organization', request.orgId));
    }

    // Update request status
    const updated = await this.joinRequestRepository.update(requestId, {
      status: 'rejected',
      reviewedByUserId: reviewerUserId,
      rejectionReason: reason || null,
    });

    // Notify user
    await this.notificationRepository.create({
      userId: request.userId,
      type: 'join_rejected',
      title: 'Join Request Rejected',
      message: reason
        ? `Your request to join ${org.name} has been rejected: ${reason}`
        : `Your request to join ${org.name} has been rejected`,
      relatedEntityType: 'org',
      relatedEntityId: org.id,
      isRead: false,
      readAt: null,
    });

    return Result.ok(updated);
  }

  async listPending(orgId: string): Promise<Result<JoinRequest[], Error>> {
    const org = await this.orgRepository.findById(orgId);
    if (!org) {
      return Result.err(new NotFoundError('Organization', orgId));
    }

    const requests = await this.joinRequestRepository.findByOrgId(orgId, 'pending');
    return Result.ok(requests);
  }
}

