import { PlanStatus } from '@prisma/client';
import { BadRequestError } from '../../lib/errors.js';

const TRANSITIONS: Record<PlanStatus, PlanStatus[]> = {
  DRAFT: [PlanStatus.OPEN, PlanStatus.CANCELLED],
  OPEN: [PlanStatus.CONFIRMING, PlanStatus.EXPIRED, PlanStatus.CANCELLED],
  CONFIRMING: [PlanStatus.CONFIRMED, PlanStatus.OPEN, PlanStatus.CANCELLED],
  CONFIRMED: [PlanStatus.COMPLETED, PlanStatus.CANCELLED],
  COMPLETED: [],
  EXPIRED: [],
  CANCELLED: [],
};

export function assertTransition(current: PlanStatus, target: PlanStatus): void {
  if (!TRANSITIONS[current].includes(target)) {
    throw new BadRequestError(`Invalid transition: ${current} -> ${target}`);
  }
}
