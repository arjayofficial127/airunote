'use client';

import { useEffect, useState } from 'react';
import { useOrgSession } from '@/providers/OrgSessionProvider';
import { buildCheckoutUrl } from '@/lib/payments/checkout';
import { UPGRADE_REQUIRED_EVENT, type UpgradeRequiredDetail } from '@/lib/payments/upgradeRequiredPrompt';

const DEFAULT_MESSAGE = "You've reached your free plan limit. Upgrade to Pro to continue creating documents.";
const SECONDARY_MESSAGE = 'Takes less than 30 seconds.';

export function UpgradeRequiredModal() {
  const { activeOrgId } = useOrgSession();
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState(DEFAULT_MESSAGE);
  const [isRedirecting, setIsRedirecting] = useState(false);

  useEffect(() => {
    const handleUpgradeRequired = (event: Event) => {
      const customEvent = event as CustomEvent<UpgradeRequiredDetail>;
      setMessage(customEvent.detail?.message || DEFAULT_MESSAGE);
      setIsRedirecting(false);
      setIsOpen(true);
    };

    window.addEventListener(UPGRADE_REQUIRED_EVENT, handleUpgradeRequired as EventListener);

    return () => {
      window.removeEventListener(UPGRADE_REQUIRED_EVENT, handleUpgradeRequired as EventListener);
    };
  }, []);

  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-[110] flex items-center justify-center bg-black/50 p-4"
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          setIsRedirecting(false);
          setIsOpen(false);
        }
      }}
    >
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Upgrade required</h2>
            <p className="mt-2 text-sm text-gray-600">{message}</p>
            <p className="mt-1 text-xs text-gray-500">{SECONDARY_MESSAGE}</p>
          </div>
          <button
            type="button"
            onClick={() => {
              setIsRedirecting(false);
              setIsOpen(false);
            }}
            className="text-gray-400 transition hover:text-gray-600"
            aria-label="Close upgrade prompt"
          >
            ×
          </button>
        </div>

        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={() => {
              setIsRedirecting(false);
              setIsOpen(false);
            }}
            className="rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-200"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => {
              if (!activeOrgId || isRedirecting) {
                return;
              }

              setIsRedirecting(true);
              const successUrl = `${window.location.origin}${window.location.pathname}?upgraded=1`;
              window.location.href = buildCheckoutUrl(activeOrgId, successUrl);
            }}
            disabled={!activeOrgId || isRedirecting}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isRedirecting ? 'Redirecting...' : 'Upgrade'}
          </button>
        </div>
      </div>
    </div>
  );
}