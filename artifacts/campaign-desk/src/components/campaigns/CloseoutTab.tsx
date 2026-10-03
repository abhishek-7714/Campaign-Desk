import { useState } from 'react';
import { Save } from 'lucide-react';
import { PAYMENT_STATUSES, type Campaign, type Closeout, type PaymentStatus } from '@/domain/types';
import { validUrl } from '@/domain/helpers';
import { SelectField, TextField } from '@/components/ui-bits';
import { useStore } from '@/state/store';

const ITEMS: { key: keyof Closeout; label: string }[] = [
  { key: 'contentApproved', label: 'Content approved' },
  { key: 'publicationConfirmed', label: 'Publication confirmed' },
  { key: 'urlRecorded', label: 'Publication URL recorded' },
  { key: 'invoiceSubmitted', label: 'Invoice submitted' },
  { key: 'invoiceAccepted', label: 'Invoice accepted' },
  { key: 'paymentRecorded', label: 'Payment status recorded' },
];

export default function CloseoutTab({ campaign }: { campaign: Campaign }) {
  const { saveCloseout, notify } = useStore();
  const [closeout, setCloseout] = useState<Closeout>(campaign.closeout);
  const [url, setUrl] = useState(campaign.publicationUrl);
  const [payment, setPayment] = useState<PaymentStatus>(campaign.paymentStatus);
  const [error, setError] = useState('');
  const dirty = url !== campaign.publicationUrl || payment !== campaign.paymentStatus || ITEMS.some((i) => closeout[i.key] !== campaign.closeout[i.key]);

  const submit = () => {
    const trimmed = url.trim();
    if (trimmed && !validUrl(trimmed)) { setError('Enter a full URL starting with http:// or https://'); return; }
    if (closeout.urlRecorded && !trimmed) { setError('Add the publication URL, or untick "Publication URL recorded".'); return; }
    setError('');
    saveCloseout(campaign.id, { closeout, publicationUrl: trimmed, paymentStatus: payment });
    setUrl(trimmed);
    if (!dirty) notify('No changes to save');
  };

  return (
    <form className="detail-grid" noValidate onSubmit={(e) => { e.preventDefault(); submit(); }} data-testid="form-closeout">
      <div className="panel">
        <div className="panel-head"><h3 className="section-title">Closeout checklist</h3><span className="count-label">{ITEMS.filter((i) => closeout[i.key]).length} of {ITEMS.length} recorded</span></div>
        <div className="panel-body">
          <div className="checklist">
            {ITEMS.map((i) => (
              <label key={i.key} className="check-item">
                <input type="checkbox" className="check" checked={closeout[i.key]} onChange={(e) => setCloseout({ ...closeout, [i.key]: e.target.checked })} />
                {i.label}
              </label>
            ))}
          </div>
          <div className="form-grid" style={{ marginTop: 14 }}>
            <TextField wide label="Publication URL" type="url" placeholder="https://" value={url} error={error} onChange={(e) => setUrl(e.target.value)} />
            <SelectField label="Payment status" value={payment} options={PAYMENT_STATUSES} onChange={(e) => setPayment(e.target.value as PaymentStatus)} />
          </div>
          <p className="disclaimer">Status tracking only. Campaign Desk records what your team enters; it does not create invoices, process payments or verify publication or payment with any external service. Changing payment status does not change the campaign status.</p>
        </div>
        <div className="modal-foot">
          <span className="count-label" style={{ marginRight: 'auto' }}>{dirty ? 'Unsaved changes' : 'All changes saved'}</span>
          <button type="submit" className="button primary" data-testid="button-save-closeout"><Save />Save closeout</button>
        </div>
      </div>
      <div className="panel">
        <div className="panel-head"><h3 className="section-title">Saved state</h3></div>
        <div className="panel-body">
          <div className="side-fact"><span>Campaign status</span><strong>{campaign.status}</strong></div>
          <div className="side-fact"><span>Invoice</span><strong>{campaign.invoiceStatus}</strong></div>
          <div className="side-fact"><span>Payment</span><strong>{campaign.paymentStatus}</strong></div>
          <div className="side-fact"><span>Publication URL</span><strong style={{ maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{campaign.publicationUrl || 'Not recorded'}</strong></div>
        </div>
      </div>
    </form>
  );
}
