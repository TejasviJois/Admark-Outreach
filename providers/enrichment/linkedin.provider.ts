export type LinkedInLookupResult = {
  linkedinUrl: string | null;
};

export interface LinkedInProvider {
  lookup(input: {
    companyName: string;
    website?: string | null;
  }): Promise<LinkedInLookupResult>;
}

export class StubLinkedInProvider implements LinkedInProvider {
  async lookup(): Promise<LinkedInLookupResult> {
    return { linkedinUrl: null };
  }
}

export function createLinkedInProvider(): LinkedInProvider {
  return new StubLinkedInProvider();
}
