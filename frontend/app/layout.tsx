import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { ToastContainer } from '@/lib/toast';
import ConditionalFooter from '@/components/layout/ConditionalFooter';
import { ErrorBoundary } from '@/components/errors/ErrorBoundary';
import { ConnectivityAwarenessBanner } from '@/components/system/ConnectivityAwarenessBanner';
import { QueryProvider } from '@/providers/QueryProvider';
import { AuthSessionProvider } from '@/providers/AuthSessionProvider';
import { OrgSessionProvider } from '@/providers/OrgSessionProvider';
import { MetadataIndexProvider } from '@/providers/MetadataIndexProvider';
import { HydratedContentProvider } from '@/providers/HydratedContentProvider';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'AtomicFuel',
  description: 'Multi-organization backend foundation',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <AuthSessionProvider>
          <OrgSessionProvider>
            <MetadataIndexProvider>
              <HydratedContentProvider>
                <QueryProvider>
                  <ErrorBoundary>
                    <ConnectivityAwarenessBanner />
                    <div className="flex flex-col min-h-screen">
                      {children}
                      <ConditionalFooter />
                    </div>
                    {/* ToastContainer must be here for toasts to show globally */}
                    <ToastContainer />
                  </ErrorBoundary>
                </QueryProvider>
              </HydratedContentProvider>
            </MetadataIndexProvider>
          </OrgSessionProvider>
        </AuthSessionProvider>
      </body>
    </html>
  );
}

