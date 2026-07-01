import type { CustomerTelemetry } from '../types';

export interface CostModel {
  currentDailyGB: number;
  currentAnnualEstimate: number;
  proposedSIEMDailyGB: number;
  proposedLakeDailyGB: number;
  proposedArchiveDailyGB: number;
  proposedAnnualEstimate: number;
  annualSavings: number;
  savingsPercent: number;
  assumptions: string[];
}

const COST_PER_GB_DAY = {
  siem: 3.50,
  lake: 0.35,
  archive: 0.05,
};

export function generateCostModel(customer: CustomerTelemetry): CostModel {
  const totalInGB = (customer.streamInBytes + customer.edgeInBytes) / 1073741824;
  const currentDailyGB = totalInGB;
  const currentAnnualEstimate = currentDailyGB * COST_PER_GB_DAY.siem * 365;

  let proposedSIEMDailyGB: number;
  let proposedLakeDailyGB: number;
  let proposedArchiveDailyGB: number;

  if (currentDailyGB > 0) {
    proposedSIEMDailyGB = currentDailyGB * 0.30;
    proposedLakeDailyGB = currentDailyGB * 0.50;
    proposedArchiveDailyGB = currentDailyGB * 0.20;
  } else {
    proposedSIEMDailyGB = 0;
    proposedLakeDailyGB = 0;
    proposedArchiveDailyGB = 0;
  }

  const proposedAnnualEstimate =
    (proposedSIEMDailyGB * COST_PER_GB_DAY.siem * 365) +
    (proposedLakeDailyGB * COST_PER_GB_DAY.lake * 365) +
    (proposedArchiveDailyGB * COST_PER_GB_DAY.archive * 365);

  const annualSavings = currentAnnualEstimate - proposedAnnualEstimate;
  const savingsPercent = currentAnnualEstimate > 0 ? (annualSavings / currentAnnualEstimate) * 100 : 0;

  return {
    currentDailyGB,
    currentAnnualEstimate,
    proposedSIEMDailyGB,
    proposedLakeDailyGB,
    proposedArchiveDailyGB,
    proposedAnnualEstimate,
    annualSavings,
    savingsPercent,
    assumptions: [
      `SIEM ingest cost: $${COST_PER_GB_DAY.siem}/GB/day (industry average)`,
      `Lake retention cost: $${COST_PER_GB_DAY.lake}/GB/day (Cribl Lake estimate)`,
      `Archive cost: $${COST_PER_GB_DAY.archive}/GB/day (S3/GCS cold tier)`,
      'Proposed split: 30% hot (SIEM), 50% warm (Lake), 20% cold (archive)',
      'Actual savings depend on customer contracts and data profiles',
    ],
  };
}
