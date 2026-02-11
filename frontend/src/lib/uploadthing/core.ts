import { createUploadthing, type FileRouter } from 'uploadthing/next';
import { cookies } from 'next/headers';
import { z } from 'zod';

const f = createUploadthing();

export const ourFileRouter = {
  postAttachment: f({
    image: {
      maxFileSize: '4MB',
      maxFileCount: 5,
    },
    pdf: {
      maxFileSize: '4MB',
      maxFileCount: 5,
    },
  })
    .input(z.object({ orgId: z.string().optional() }))
    .middleware(async ({ req, input }) => {
      // Check for authentication cookie
      const cookieStore = await cookies();
      const accessToken = cookieStore.get('accessToken');

      if (!accessToken) {
        throw new Error('Unauthorized - Please log in to upload files');
      }

      // Extract orgId from input (passed from UploadButton)
      const orgId = (input as { orgId?: string })?.orgId || '';

      // For MVP, we'll just verify cookie exists
      // Full auth verification happens in backend when creating attachment records
      return { userId: 'verified', orgId };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      // File uploaded successfully
      // Metadata contains userId and orgId
      // File contains url, name, size, etc.
      console.log('Upload complete for orgId:', metadata.orgId);
      console.log('File URL:', file.url);
    }),
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;

