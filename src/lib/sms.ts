export interface SmsPayload {
  to: string;
  body: string;
  assignmentId?: string;
  eventType:
    | "ASSIGNMENT_REQUEST"
    | "ASSIGNMENT_ACCEPTED"
    | "ASSIGNMENT_DECLINED"
    | "ASSIGNMENT_PENDING_REMINDER"
    | "ASSIGNMENT_REASSIGNED";
}

export interface SmsResult {
  success: boolean;
  provider: string;
  providerId: string;
  to: string;
  error?: string;
}

const DEMO_NUMBER = "4803261838";

export async function sendAssignmentSms(payload: SmsPayload): Promise<SmsResult> {
  // For demo we route all assignment messages to one number while preserving provider shape.
  const to = DEMO_NUMBER;

  if (!payload.body?.trim()) {
    return {
      success: false,
      provider: "mock-twilio",
      providerId: `mock-${Date.now()}`,
      to,
      error: "SMS body is empty",
    };
  }

  return {
    success: true,
    provider: "mock-twilio",
    providerId: `mock-${Date.now()}`,
    to,
  };
}
