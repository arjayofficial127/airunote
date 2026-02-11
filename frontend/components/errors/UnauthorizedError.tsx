'use client';

import Link from 'next/link';

interface UnauthorizedErrorProps {
  statusCode?: 401 | 403;
  message?: string;
}

export default function UnauthorizedError({ 
  statusCode = 401, 
  message 
}: UnauthorizedErrorProps) {
  const defaultMessage = statusCode === 401 
    ? 'Authentication required to access this resource.'
    : 'You do not have permission to access this resource.';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full mx-auto text-center px-4">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="mb-6">
            <div className="text-6xl font-bold text-red-600 mb-2">{statusCode}</div>
            <h1 className="text-2xl font-semibold text-gray-900 mb-2">
              {statusCode === 401 ? 'Unauthorized' : 'Forbidden'}
            </h1>
            <p className="text-gray-600">
              {message || defaultMessage}
            </p>
          </div>
          
          <div className="space-y-3">
            <Link
              href="/login"
              className="block w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Go to Login
            </Link>
            <Link
              href="/orgs"
              className="block w-full px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
            >
              Back to Organizations
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
