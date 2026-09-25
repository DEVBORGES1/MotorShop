import { MOTO_STATUS, MOTO_STATUS_LABEL } from '@motorshop/shared';

import { Badge } from '@/components/ui/Badge.jsx';

const TOM = {
  [MOTO_STATUS.AVAILABLE]: 'ok',
  [MOTO_STATUS.RESERVED]: 'warn',
  [MOTO_STATUS.SOLD]: 'danger',
};

/** Selo de status da moto no site público (decisão A). */
export function StatusBadge({ status }) {
  if (!TOM[status]) return null;
  return <Badge tone={TOM[status]}>{MOTO_STATUS_LABEL[status]}</Badge>;
}
