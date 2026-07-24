export type TechStackResult = {
  technologies: string[];
};

export interface TechStackProvider {
  lookup(websiteUrl: string): Promise<TechStackResult>;
}

/** V1 stub — wire BuiltWith / Wappalyzer later. */
export class NoopTechStackProvider implements TechStackProvider {
  async lookup(_websiteUrl: string): Promise<TechStackResult> {
    return { technologies: [] };
  }
}

export function createTechStackProvider(): TechStackProvider {
  return new NoopTechStackProvider();
}
