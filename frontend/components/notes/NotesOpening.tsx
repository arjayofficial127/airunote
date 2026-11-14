import Image from 'next/image';
import './notesOpening.css';

export function NotesOpening() {
  return <div className="an-notes-opening">
    <div className="an-notes-opening-brand">
      <Image src="/airunote/airunote_logo.png" width={24} height={24} alt="" priority />airunote
    </div>
    <p role="status">Opening Notes…</p>
  </div>;
}
