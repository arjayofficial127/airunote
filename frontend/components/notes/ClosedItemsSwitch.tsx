'use client';

export function ClosedItemsSwitch({ checked, onChange }: { checked: boolean; onChange: (checked: boolean) => void }) {
  return <label className="an-toggle-label"><input className="an-switch" type="checkbox" role="switch" checked={checked} onChange={event => onChange(event.target.checked)} /><span>Done / cancelled</span></label>;
}
