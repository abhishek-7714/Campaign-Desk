import { useLocation } from 'wouter';
import { Modal } from '@/components/ui-bits';
import { useStore } from '@/state/store';
import { ProgrammeFields, useProgrammeForm } from './ProgrammeFields';

export default function NewProgrammeDialog({ onClose }: { onClose: () => void }) {
  const { createProgramme } = useStore();
  const [, navigate] = useLocation();
  const api = useProgrammeForm();
  const submit = () => {
    const input = api.submit();
    if (!input) return;
    const id = createProgramme(input);
    onClose();
    navigate(`/programmes/${id}`);
  };
  return (
    <Modal title="New campaign" onClose={onClose} onSubmit={submit} submitLabel="Create campaign">
      <p className="pg-lead">A new campaign starts as a draft. Only you can see it until you publish it to the marketplace. You can change everything later.</p>
      <ProgrammeFields api={api} />
    </Modal>
  );
}
