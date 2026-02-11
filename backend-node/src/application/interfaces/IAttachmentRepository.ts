import { Attachment } from '../../domain/entities/Attachment';

export interface IAttachmentRepository {
  create(attachment: Omit<Attachment, 'id' | 'createdAt'>): Promise<Attachment>;
  findById(id: string): Promise<Attachment | null>;
  findByPostId(postId: string): Promise<Attachment[]>;
  delete(id: string): Promise<void>;
  countByPostId(postId: string): Promise<number>;
}

