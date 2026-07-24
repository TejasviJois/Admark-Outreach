export type SendEmailInput = {
  to: string;
  subject: string;
  body: string;
};

export type SendEmailResult = {
  providerMessageId: string;
};

export interface EmailProvider {
  send(input: SendEmailInput): Promise<SendEmailResult>;
}
