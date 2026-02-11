import { PostUseCase } from '../../src/application/use-cases/PostUseCase';
import { IPostRepository } from '../../src/application/interfaces/IPostRepository';
import { IOrgRepository } from '../../src/application/interfaces/IOrgRepository';
import { Result } from '../../src/core/result/Result';
import { ValidationError } from '../../src/core/errors/AppError';

describe('PostUseCase - 3 Post Limit Rule', () => {
  let postUseCase: PostUseCase;
  let mockPostRepository: jest.Mocked<IPostRepository>;
  let mockOrgRepository: jest.Mocked<IOrgRepository>;

  beforeEach(() => {
    mockPostRepository = {
      create: jest.fn(),
      findById: jest.fn(),
      findByOrgId: jest.fn(),
      countByOrgIdAndAuthor: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    } as any;

    mockOrgRepository = {
      findById: jest.fn(),
    } as any;

    postUseCase = new PostUseCase(mockPostRepository, mockOrgRepository);
  });

  it('should allow creating first post', async () => {
    const orgId = 'org-1';
    const userId = 'user-1';

    mockOrgRepository.findById.mockResolvedValue({
      id: orgId,
      name: 'Test Org',
      slug: 'test-org',
      description: null,
      isActive: true,
      createdAt: new Date(),
    } as any);

    mockPostRepository.countByOrgIdAndAuthor.mockResolvedValue(0);
    mockPostRepository.create.mockResolvedValue({
      id: 'post-1',
      orgId,
      authorUserId: userId,
      title: 'Test Post',
      body: 'Body',
      isPublished: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any);

    const result = await postUseCase.create(orgId, userId, {
      title: 'Test Post',
      body: 'Body',
      isPublished: true,
    });

    expect(result.isOk()).toBe(true);
  });

  it('should allow creating up to 3 posts', async () => {
    const orgId = 'org-1';
    const userId = 'user-1';

    mockOrgRepository.findById.mockResolvedValue({
      id: orgId,
      name: 'Test Org',
      slug: 'test-org',
      description: null,
      isActive: true,
      createdAt: new Date(),
    } as any);

    mockPostRepository.countByOrgIdAndAuthor.mockResolvedValue(2);
    mockPostRepository.create.mockResolvedValue({
      id: 'post-3',
      orgId,
      authorUserId: userId,
      title: 'Third Post',
      body: 'Body',
      isPublished: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any);

    const result = await postUseCase.create(orgId, userId, {
      title: 'Third Post',
      body: 'Body',
      isPublished: true,
    });

    expect(result.isOk()).toBe(true);
  });

  it('should reject creating 4th post', async () => {
    const orgId = 'org-1';
    const userId = 'user-1';

    mockOrgRepository.findById.mockResolvedValue({
      id: orgId,
      name: 'Test Org',
      slug: 'test-org',
      description: null,
      isActive: true,
      createdAt: new Date(),
    } as any);

    mockPostRepository.countByOrgIdAndAuthor.mockResolvedValue(3);

    const result = await postUseCase.create(orgId, userId, {
      title: 'Fourth Post',
      body: 'Body',
      isPublished: true,
    });

    expect(result.isErr()).toBe(true);
    const error = result.unwrap();
    expect(error).toBeInstanceOf(ValidationError);
    expect((error as ValidationError).message).toContain('Maximum 3 posts');
  });
});

