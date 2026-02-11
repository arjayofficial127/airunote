/**
 * Example Usage of EncryptedTextField
 * 
 * This shows how to integrate encrypted fields into your forms.
 */

'use client';

import { useState } from 'react';
import { EncryptedTextField } from './EncryptedTextField';

// Example 1: Simple form with encrypted field
export function ExampleEncryptedForm() {
  const [encryptedNotes, setEncryptedNotes] = useState('');

  const handleSubmit = async () => {
    // encryptedNotes is already encrypted - just save it to API
    await fetch('/api/records/123', {
      method: 'PATCH',
      body: JSON.stringify({
        secretNotes: encryptedNotes, // Already encrypted!
      }),
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <EncryptedTextField
        value={encryptedNotes}
        onChange={setEncryptedNotes}
        label="Secret Notes"
        placeholder="Enter your secret notes here..."
        rows={6}
      />
      <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded">
        Save
      </button>
    </form>
  );
}

// Example 2: Loading encrypted data from API
export function ExampleWithApiData() {
  const [record, setRecord] = useState<any>(null);
  const [encryptedField, setEncryptedField] = useState('');

  // Load record from API
  const loadRecord = async () => {
    const res = await fetch('/api/records/123');
    const data = await res.json();
    setRecord(data);
    setEncryptedField(data.secretField || ''); // Encrypted value from API
  };

  // Save encrypted field
  const saveRecord = async () => {
    await fetch('/api/records/123', {
      method: 'PATCH',
      body: JSON.stringify({
        secretField: encryptedField, // Already encrypted!
      }),
    });
  };

  return (
    <div className="space-y-4">
      <button onClick={loadRecord}>Load Record</button>
      
      {record && (
        <EncryptedTextField
          value={encryptedField} // Encrypted value from API
          onChange={setEncryptedField} // Updates encrypted value
          label="Secret Field"
          placeholder="Enter secret content..."
        />
      )}
      
      <button onClick={saveRecord}>Save</button>
    </div>
  );
}

// Example 3: Using in a collection record form
export function ExampleCollectionRecord() {
  const [formData, setFormData] = useState({
    name: '',
    secretNotes: '', // This will be encrypted
  });

  const handleSave = async () => {
    // secretNotes is already encrypted
    await fetch('/api/orgs/org123/collections/notes/records', {
      method: 'POST',
      body: JSON.stringify({
        name: formData.name,
        secretNotes: formData.secretNotes, // Encrypted!
      }),
    });
  };

  return (
    <form onSubmit={handleSave} className="space-y-4">
      <div>
        <label>Name</label>
        <input
          type="text"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
        />
      </div>
      
      <EncryptedTextField
        value={formData.secretNotes}
        onChange={(encrypted) => 
          setFormData({ ...formData, secretNotes: encrypted })
        }
        label="Secret Notes"
        placeholder="These notes will be encrypted..."
      />
      
      <button type="submit">Save Record</button>
    </form>
  );
}
