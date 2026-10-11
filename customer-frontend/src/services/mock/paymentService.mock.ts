import { AppError, ErrorCodes } from '../errors';
import { generatePaymentReference } from '@/lib/refs';
import type { PaymentService, SimulationMode } from '../types';
import type { ServiceResult } from '@/types';
import type { PaymentRequest, PaymentResult } from '../contracts';

const SIMULATED = { source: 'mock' as const, simulated: true };

/**
 * Simulated payment adapter.
 *
 * DEMO / SANDBOX ONLY — no card details are collected or stored, and no funds
 * move. The interface mirrors what a real gateway adapter will expose so the
 * backend team can drop in KBZPay / WavePay / CB Pay / a card processor later.
 */

let simulationMode: SimulationMode = 'random';

const METHOD_CONFIRM_PREFIX: Record<PaymentRequest['method'], string> = {
  KBZPAY: 'KBZ',
  WAVEPAY: 'WV',
  CB_PAY: 'CB',
  CARD: 'CARD',
  PAY_AT_HOTEL: 'HOTEL',
};

function shouldSucceed(): boolean {
  if (simulationMode === 'force_success') return true;
  if (simulationMode === 'force_failure') return false;
  return Math.random() > 0.12;
}

export const mockPaymentService: PaymentService = {
  async processPayment(request: PaymentRequest): Promise<ServiceResult<PaymentResult>> {
    // Simulate gateway latency.
    await new Promise((resolve) => setTimeout(resolve, 1400));

    if (request.amount <= 0) {
      throw new AppError('Invalid payment amount.', ErrorCodes.INVALID_INPUT);
    }

    if (!shouldSucceed()) {
      throw new AppError(
        'The payment was declined by the simulated gateway. No funds were charged — you can retry safely.',
        ErrorCodes.PAYMENT_DECLINED,
      );
    }

    const result: PaymentResult = {
      success: true,
      transactionId: generatePaymentReference(METHOD_CONFIRM_PREFIX[request.method]),
      message: 'Sandbox payment approved. No real funds were charged.',
    };
    return { data: result, meta: SIMULATED };
  },

  getSimulationMode(): SimulationMode {
    return simulationMode;
  },

  setSimulationMode(mode: SimulationMode): void {
    simulationMode = mode;
  },
};