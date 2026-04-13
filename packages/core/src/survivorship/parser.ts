import type { Constraint, RationaleTag } from '../types';

export function classifyConstraint(constraint: Constraint): RationaleTag {
  return constraint.tag;
}
