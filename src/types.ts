/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface LedgerRow {
  id: string;
  // Date Set 1
  day1: string;
  month1: string;
  year1: string;
  // Inputs Set 1
  weight1: string; // Keep as string for friendly typing/leading dots
  percent1: string;
  // Date Set 2
  day2: string;
  month2: string;
  year2: string;
  // Inputs Set 2
  weight2: string;
  percent2: string;
  // Manual Money Set 7
  manualMoney: string;
}

export interface GrandTotals {
  calculated: boolean;
  totalWeight1: number;
  totalOutput1: number;
  totalWeight2: number;
  totalOutput2: number;
  totalManualMoney: number;
}
