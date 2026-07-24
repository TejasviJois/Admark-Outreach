export type MapsLookupResult = {
  location: string | null;
};

export interface MapsProvider {
  lookup(input: { companyName: string; website?: string | null }): Promise<MapsLookupResult>;
}

export class StubMapsProvider implements MapsProvider {
  async lookup(): Promise<MapsLookupResult> {
    return { location: null };
  }
}

export function createMapsProvider(): MapsProvider {
  return new StubMapsProvider();
}
