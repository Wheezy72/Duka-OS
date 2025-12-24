/**
 * PaymentService handles M-Pesa STK push integration.
 * It is pure Node/HTTP logic and does not depend on Electron.
 */

const MPESA_BASE_URL =
  process.env.NODE_ENV === "production"
    ? "https://api.safaricom.co.ke"
    : "https://sandbox.safaricom.co.ke";

const MPESA_KEY = process.env.MPESA_KEY;
const MPESA_SECRET = process.env.MPESA_SECRET;
const MPESA_SHORT_CODE = process.env.MPESA_SHORT_CODE;
const MPESA_PASSKEY = process.env.MPESA_PASSKEY;
const MPESA_CALLBACK_URL = process.env.MPESA_CALLBACK_URL;

if (!MPESA_KEY || !MPESA_SECRET || !MPESA_SHORT_CODE || !MPESA_PASSKEY) {
  // Configuration errors should crash fast so they are fixed during setup.
  throw new Error(
    "Missing M-Pesa configuration. Ensure MPESA_KEY, MPESA_SECRET, MPESA_SHORT_CODE and MPESA_PASSKEY are set."
  );
}

if (!MPESA_CALLBACK_URL) {
  throw new Error(
    "Missing M-Pesa callback URL. Set MPESA_CALLBACK_URL to your publicly reachable HTTPS endpoint."
  );
}

export interface STKInitiateResult {
  status: "OK" | "ERROR";
  checkoutRequestId?: string;
  raw?: unknown;
  errorMessage?: string;
  manualMode?: boolean;
}

export type PaymentStatusResult =
  | {
      status: "SUCCESS";
      raw: unknown;
    }
  | {
      status: "PENDING";
      raw: unknown;
    }
  | {
      status: "FAILED";
      reason: string;
      raw?: unknown;
    }
  | {
      status: "MANUAL_VERIFY_NEEDED";
      reason: string;
    };

export class PaymentService {
  /**
   * Safaricom uses OAuth to obtain an access token for each API call.
   */
  private async getAccessToken(): Promise<string> {
    const auth = Buffer.from(`${MPESA_KEY}:${MPESA_SECRET}`).toString("base64");

    const response = await fetch(
      `${MPESA_BASE_URL}/oauth/v1/generate?grant_type=client_credentials`,
      {
        method: "GET",
        headers: {
          Authorization: `Basic ${auth}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error(
        `M-Pesa auth failed with status ${response.status} ${response.statusText}`
      );
    }

    const json = (await response.json()) as { access_token?: string };
    if (!json.access_token) {
      throw new Error("M-Pesa auth response did not contain access_token");
    }

    return json.access_token;
  }

  /**
   * Timestamp format required by Safaricom: YYYYMMDDHHMMSS.
   */
  private getTimestamp(): string {
    const d = new Date();
    const pad = (n: number) => n.toString().padStart(2, "0");

    const year = d.getFullYear();
    const month = pad(d.getMonth() + 1);
    const day = pad(d.getDate());
    const hours = pad(d.getHours());
    const minutes = pad(d.getMinutes());
    const seconds = pad(d.getSeconds());

    return `${year}${month}${day}${hours}${minutes}${seconds}`;
  }

  private buildPassword(timestamp: string): string {
    const raw = `${MPESA_SHORT_CODE}${MPESA_PASSKEY}${timestamp}`;
    return Buffer.from(raw).toString("base64");
  }

  /**
   * Initiates an STK Push request.
   *
   * No automatic retries – callers must decide if/when to retry to avoid
   * accidental double billing.
   */
  async initiateSTK(
    phone: string,
    amount: number
  ): Promise<STKInitiateResult> {
    const timestamp = this.getTimestamp();
    const password = this.buildPassword(timestamp);

    let accessToken: string;
    try {
      accessToken = await this.getAccessToken();
    } catch (error: any) {
      // Network and remote issues are expected in the real world.
      return {
        status: "ERROR",
        errorMessage: error?.message ?? "Failed to obtain M-Pesa access token",
        manualMode: true,
      };
    }

    try {
      const response = await fetch(
        `${MPESA_BASE_URL}/mpesa/stkpush/v1/processrequest`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            BusinessShortCode: MPESA_SHORT_CODE,
            Password: password,
            Timestamp: timestamp,
            TransactionType: "CustomerPayBillOnline",
            Amount: amount,
            PartyA: phone,
            PartyB: MPESA_SHORT_CODE,
            PhoneNumber: phone,
            CallBackURL: MPESA_CALLBACK_URL,
            AccountReference: "DUKA-OS",
            TransactionDesc: "DUKA-OS SALE",
          }),
        }
      );

      const raw = await response.json();

      if (!response.ok) {
        return {
          status: "ERROR",
          errorMessage: `M-Pesa STK push failed with status ${response.status}`,
          manualMode: true,
          raw,
        };
      }

      const checkoutRequestId =
        (raw as any).CheckoutRequestID || (raw as any).CheckoutRequestId;

      if (!checkoutRequestId) {
        return {
          status: "ERROR",
          errorMessage: "M-Pesa STK push response missing CheckoutRequestID",
          manualMode: true,
          raw,
        };
      }

      return {
        status: "OK",
        checkoutRequestId,
        raw,
      };
    } catch (error: any) {
      // Network failure – fall back to manual verification.
      return {
        status: "ERROR",
        errorMessage: error?.message ?? "Network error calling M-Pesa STK API",
        manualMode: true,
      };
    }
  }

  /**
   * Polls the STK Push status.
   *
   * Any network/API failure returns MANUAL_VERIFY_NEEDED so the cashier can
   * fall back to checking the customer's phone or M-Pesa statements.
   */
  async checkStatus(
    checkoutRequestId: string
  ): Promise<PaymentStatusResult> {
    const timestamp = this.getTimestamp();
    const password = this.buildPassword(timestamp);

    let accessToken: string;
    try {
      accessToken = await this.getAccessToken();
    } catch (error: any) {
      return {
        status: "MANUAL_VERIFY_NEEDED",
        reason:
          error?.message ?? "Failed to obtain M-Pesa access token for status",
      };
    }

    try {
      const response = await fetch(
        `${MPESA_BASE_URL}/mpesa/stkpushquery/v1/query`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            BusinessShortCode: MPESA_SHORT_CODE,
            Password: password,
            Timestamp: timestamp,
            CheckoutRequestID: checkoutRequestId,
          }),
        }
      );

      const raw = await response.json();

      if (!response.ok) {
        return {
          status: "MANUAL_VERIFY_NEEDED",
          reason: `M-Pesa status check HTTP ${response.status}`,
        };
      }

      const resultCode = (raw as any).ResultCode ?? (raw as any).resultCode;
      const resultDesc = (raw as any).ResultDesc ?? (raw as any).resultDesc;

      if (resultCode === "0" || resultCode === 0) {
        return { status: "SUCCESS", raw };
      }

      // Safaricom typically uses non-zero codes for errors and pending states.
      if (resultCode === "1032" || resultCode === "1") {
        // Common failure codes – treated as failed, not manual.
        return {
          status: "FAILED",
          reason: resultDesc || "M-Pesa reported failure",
          raw,
        };
      }

      if (resultCode === "1001" || resultCode === "10") {
        // Example of a "still processing" style code.
        return { status: "PENDING", raw };
      }

      // Anything ambiguous falls back to manual verification.
      return {
        status: "MANUAL_VERIFY_NEEDED",
        reason: resultDesc || "Unknown M-Pesa status code",
      };
    } catch (error: any) {
      return {
        status: "MANUAL_VERIFY_NEEDED",
        reason: error?.message ?? "Network error calling M-Pesa status API",
      };
    }
  }
}