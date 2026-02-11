'use client';

import { useState, useEffect } from 'react';
import { UploadButton } from '@uploadthing/react';
import type { OurFileRouter } from '@/src/lib/uploadthing/core';
import type { CreateAttachmentInput } from '@/lib/api/attachments';
import Image from 'next/image';

interface PostAttachmentsUploaderProps {
  orgId: string;
  postId?: string;
  onUploadComplete?: (attachments: CreateAttachmentInput[]) => void;
  existingAttachments?: any[];
}

export default function PostAttachmentsUploader({
  orgId,
  postId,
  onUploadComplete,
  existingAttachments = [],
}: PostAttachmentsUploaderProps) {
  const [uploadedFiles, setUploadedFiles] = useState<CreateAttachmentInput[]>([]);
  const [uploading, setUploading] = useState(false);
  const [isUploadThingConfigured, setIsUploadThingConfigured] = useState(false);

  // Check if UploadThing is configured
  // Note: UPLOADTHING_SECRET is server-side only, so we check for the public app ID
  useEffect(() => {
    const appId = process.env.NEXT_PUBLIC_UPLOADTHING_APP_ID;
    console.log('[PostAttachmentsUploader] Checking UploadThing config (v7)...');
    console.log('[PostAttachmentsUploader] NEXT_PUBLIC_UPLOADTHING_APP_ID:', appId || 'NOT SET');
    console.log('[PostAttachmentsUploader] Is configured:', !!appId);
    setIsUploadThingConfigured(!!appId);
    
    if (!appId) {
      console.warn('[PostAttachmentsUploader] UploadThing is not configured. Set NEXT_PUBLIC_UPLOADTHING_APP_ID in your environment variables.');
    }
  }, []);

  const handleUploadComplete = (res: any) => {
    const newAttachments: CreateAttachmentInput[] = res.map((file: any) => {
      // Determine type from mime type
      let type: 'image' | 'file' | 'video' | 'link' = 'file';
      if (file.type?.startsWith('image/')) {
        type = 'image';
      } else if (file.type?.startsWith('video/')) {
        type = 'video';
      }

      return {
        url: file.url,
        fileName: file.name,
        mimeType: file.type,
        sizeBytes: file.size,
        type,
        order: uploadedFiles.length,
      };
    });

    const updated = [...uploadedFiles, ...newAttachments];
    setUploadedFiles(updated);
    setUploading(false);

    if (onUploadComplete) {
      onUploadComplete(updated);
    }
  };

  const handleUploadError = (error: Error) => {
    console.error('Upload error:', error);
    setUploading(false);
    alert(`Upload failed: ${error.message}. Please check your UploadThing configuration.`);
  };

  const handleRemove = (index: number) => {
    const updated = uploadedFiles.filter((_, i) => i !== index);
    setUploadedFiles(updated);
    if (onUploadComplete) {
      onUploadComplete(updated);
    }
  };

  // Show message if UploadThing is not configured instead of hiding
  if (!isUploadThingConfigured) {
    return (
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Attachments
          </label>
          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm text-yellow-800">
              File upload is not configured. Please set <code className="bg-yellow-100 px-1 rounded">NEXT_PUBLIC_UPLOADTHING_APP_ID</code> in your Vercel environment variables.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Attachments
        </label>

        <UploadButton<OurFileRouter, "postAttachment">
          endpoint="postAttachment"
          onUploadBegin={() => {
            console.log('[PostAttachmentsUploader] Upload started');
            setUploading(true);
          }}
          onClientUploadComplete={(res) => {
            console.log('[PostAttachmentsUploader] Upload complete:', res);
            handleUploadComplete(res);
          }}
          onUploadError={(error) => {
            console.error('[PostAttachmentsUploader] Upload error:', error);
            handleUploadError(error);
          }}
          className="ut-button:bg-blue-600 ut-button:hover:bg-blue-700"
          input={{
            orgId,
          }}
        />

        {uploading && (
          <p className="mt-2 text-sm text-gray-600">Uploading...</p>
        )}
      </div>

      {uploadedFiles.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-gray-700">
            Uploaded Files ({uploadedFiles.length})
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {uploadedFiles.map((file, index) => (
              <div
                key={index}
                className="relative border border-gray-200 rounded-lg p-3"
              >
                {file.type === 'image' && file.url ? (
                  <Image
                    src={file.url}
                    alt={file.fileName || 'Uploaded image'}
                    width={200}
                    height={96}
                    className="w-full h-24 object-cover rounded"
                    unoptimized
                  />
                ) : (
                  <div className="w-full h-24 bg-gray-100 rounded flex items-center justify-center">
                    <svg
                      className="w-8 h-8 text-gray-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                      />
                    </svg>
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => handleRemove(index)}
                  className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600"
                >
                  ×
                </button>
                {file.fileName && (
                  <p className="mt-1 text-xs text-gray-600 truncate">
                    {file.fileName}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

