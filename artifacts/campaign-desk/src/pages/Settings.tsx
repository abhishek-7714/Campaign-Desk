import { useState } from 'react';
import { PageTitle, Pill } from '@/components/viz/Cards';
import { TextField } from '@/components/ui-bits';
import { CURRENT_USER, STORAGE_KEY } from '@/domain/helpers';
import { useStore } from '@/state/store';

export default function Settings() {
  const { workspaceName, setWorkspaceName, notify, resetSample, integrations, setIntegration } = useStore();
  const [name, setName] = useState(workspaceName);
  const [error, setError] = useState('');
  const [confirm, setConfirm] = useState(false);
  const save = () => {
    if (!name.trim()) { setError('Workspace name is required.'); return; }
    setError(''); setWorkspaceName(name.trim()); notify('Workspace name saved');
  };
  return (
    <>
      <PageTitle title="Workspace settings" sub="Saved in this browser only." />
      <div className="card" style={{ maxWidth: 680 }}>
        <form noValidate onSubmit={(e) => { e.preventDefault(); save(); }} className="settings-section">
          <div style={{ flex: 1 }}><TextField label="Workspace name" value={name} error={error} onChange={(e) => setName(e.target.value)} /></div>
          <button className="btn primary" type="submit" disabled={name.trim() === workspaceName}>Save</button>
        </form>
        <div className="settings-section">
          <div><strong>Shopify</strong><small>Matches orders to each creator&apos;s discount code. Prototype: sample orders only.</small></div>
          <button className="btn" onClick={() => setIntegration('shopify', !integrations.shopify)}>{integrations.shopify ? 'Disconnect' : 'Connect'}</button>
        </div>
        <div className="settings-section">
          <div><strong>Instagram (brand account)</strong><small>Unlocks reach, saves and shares on Collab posts. Prototype: nothing is really connected.</small></div>
          <button className="btn" onClick={() => setIntegration('instagram', !integrations.instagram)}>{integrations.instagram ? 'Disconnect' : 'Connect'}</button>
        </div>
        <div className="settings-section"><div><strong>Current user</strong><small>Fixed for this prototype; there is no sign-in.</small></div><span>{CURRENT_USER}</span></div>
        <div className="settings-section"><div><strong>Browser storage</strong><small>Data is kept under <code>{STORAGE_KEY}</code> in this browser. Nothing is sent to a server.</small></div><Pill tone="mint">Local only</Pill></div>
        <div className="settings-section">
          <div><strong>Reset sample data</strong><small>Discards all local edits and restores the seeded campaigns, tasks and example history.</small></div>
          {confirm
            ? <div className="ptitle-actions"><button className="btn danger" onClick={() => { resetSample(); setConfirm(false); }}>Confirm reset</button><button className="btn" onClick={() => setConfirm(false)}>Cancel</button></div>
            : <button className="btn danger" onClick={() => setConfirm(true)}>Reset data</button>}
        </div>
      </div>
    </>
  );
}
