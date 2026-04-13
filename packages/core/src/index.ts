// packages/core/src/index.ts
export { trace } from './trace/index';
export { fearScore, fearLabel, scanConstraintLanguage } from './score/fear';
export { busFactorScore, inactiveOwnershipRatio } from './score/bus';
export { writeRationaleFile, readRationaleFile, findRationaleForRange, listRationaleFiles, buildRationaleId } from './trace/rationale';
export { hashCodeRegion, readFileLines, extractCodeRegion, blameRange } from './trace/git';
export { runSurvivorshipChecks } from './survivorship/checker';
export type * from './types';
