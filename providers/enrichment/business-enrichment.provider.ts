export type BusinessEnrichmentResult = {
  industry: string | null;
  teamSize: number | null;
  location: string | null;
};

export interface BusinessEnrichmentProvider {
  enrich(input: {
    companyName: string | null;
    website: string;
  }): Promise<BusinessEnrichmentResult>;
}

/** V1 stub — wire Apollo / PDL / Clearbit later. */
export class NoopBusinessEnrichmentProvider implements BusinessEnrichmentProvider {
  async enrich(): Promise<BusinessEnrichmentResult> {
    return {
      industry: null,
      teamSize: null,
      location: null,
    };
  }
}

export function createBusinessEnrichmentProvider(): BusinessEnrichmentProvider {
  return new NoopBusinessEnrichmentProvider();
}
