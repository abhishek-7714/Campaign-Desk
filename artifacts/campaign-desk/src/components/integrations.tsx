/**
 * Mock "connect your account" dialogs. They look like an OAuth consent screen and flip the
 * matching flag in the store. Nothing is sent anywhere: the prototype says so on screen.
 */
import { useEffect, useRef, useState } from 'react';
import { Check, Instagram, Loader2, ShieldCheck, ShoppingBag } from 'lucide-react';
import { Modal } from '@/components/ui-bits';
import { PrototypeNote } from '@/components/shared';
import { useStore } from '@/state/store';

function useDelayedFinish(finish: () => void) {
  const t = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(t.current), []);
  return () => { t.current = window.setTimeout(finish, 1300); };
}

/** who="brand": connects the workspace's Instagram (unlocks reach on Collab posts).
 *  who="creator": connects the acting creator's own account (unlocks reach on all their posts). */
export function ConnectInstagramDialog({ who, onClose }: { who: 'brand' | 'creator'; onClose: () => void }) {
  const { setIntegration, connectCreatorInstagram, actingCreator, workspaceName } = useStore();
  const [busy, setBusy] = useState(false);
  const account = who === 'brand' ? 'riseoats' : actingCreator.handle;
  const start = useDelayedFinish(() => {
    if (who === 'brand') setIntegration('instagram', true); else connectCreatorInstagram(actingCreator.id);
    onClose();
  });
  const rows = who === 'brand'
    ? ['Read insights (reach, saves, shares) for posts on your account', 'Read your media, including Collab posts shared with you', 'Never post, comment or message on your behalf']
    : ['Read insights (reach, saves, shares) for your posts and stories', 'Read your media so brands see the right numbers', 'Never post, comment or message on your behalf'];
  return (
    <Modal title="Connect Instagram" onClose={onClose} submitLabel={busy ? 'Connecting…' : 'Connect account'} onSubmit={() => { if (busy) return; setBusy(true); start(); }}>
      <div className="connect">
        <div className="connect-head"><span className="connect-ico"><Instagram size={22} /></span><div><b>@{account}</b><small>{who === 'brand' ? `${workspaceName} · professional account` : 'Creator account · professional'}</small></div></div>
        <p className="connect-lead">{who === 'brand'
          ? 'Connect your brand account to see reach, saves and shares on posts where the creator adds you as a Collab partner.'
          : 'Connect once and brands see accurate reach and saves on every post. You never have to send screenshots again.'}</p>
        <ul className="connect-list">{rows.map((r) => <li key={r}><Check size={14} />{r}</li>)}</ul>
        <p className="connect-safe"><ShieldCheck size={14} />You can disconnect at any time from Settings.</p>
        {busy && <p className="connect-busy"><Loader2 size={14} className="spin" />Contacting Instagram…</p>}
        <PrototypeNote>Prototype: this screen is a mock. No account is connected and no data is read.</PrototypeNote>
      </div>
    </Modal>
  );
}

export function ConnectShopifyDialog({ onClose }: { onClose: () => void }) {
  const { setIntegration, workspaceName } = useStore();
  const [busy, setBusy] = useState(false);
  const start = useDelayedFinish(() => { setIntegration('shopify', true); onClose(); });
  return (
    <Modal title="Connect Shopify" onClose={onClose} submitLabel={busy ? 'Connecting…' : 'Connect store'} onSubmit={() => { if (busy) return; setBusy(true); start(); }}>
      <div className="connect">
        <div className="connect-head"><span className="connect-ico shop"><ShoppingBag size={22} /></span><div><b>{workspaceName.replace(/[^A-Za-z0-9]+/g, '').toLowerCase()}.myshopify.com</b><small>Online store</small></div></div>
        <p className="connect-lead">Orders that use a creator&apos;s discount code or tracking link are matched to that creator, so you can see sales and return on spend per post.</p>
        <ul className="connect-list">
          <li><Check size={14} />Read orders and discount code usage</li>
          <li><Check size={14} />Read store analytics for tracking links</li>
          <li><Check size={14} />Never change products, prices or orders</li>
        </ul>
        <p className="connect-safe"><ShieldCheck size={14} />Blinkit, Amazon and offline sales are not attributed to creators.</p>
        {busy && <p className="connect-busy"><Loader2 size={14} className="spin" />Contacting Shopify…</p>}
        <PrototypeNote>Prototype: this screen is a mock. No store is connected; sales numbers are sample data.</PrototypeNote>
      </div>
    </Modal>
  );
}
