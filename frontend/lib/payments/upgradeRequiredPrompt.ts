'use client';

export const UPGRADE_REQUIRED_EVENT = 'airunote:upgrade-required';

export interface UpgradeRequiredDetail {
  message?: string;
}

export function openUpgradeRequiredPrompt(detail: UpgradeRequiredDetail = {}) {
  if (typeof window === 'undefined') {
    return;
  }

  window.dispatchEvent(new CustomEvent<UpgradeRequiredDetail>(UPGRADE_REQUIRED_EVENT, { detail }));
}