export type CrawledPage = {
  url: string;
  title: string | null;
  text: string;
  emails: string[];
  phones: string[];
};

export type WebsiteExtractionResult = {
  website: string;
  companyName: string | null;
  about: string | null;
  services: string[];
  contactEmail: string | null;
  linkedinUrl: string | null;
  socialLinks: Record<string, string>;
  location: string | null;
  sourcePages: string[];
  pages: CrawledPage[];
};

export interface WebsiteCrawlProvider {
  extractFromWebsite(websiteUrl: string): Promise<WebsiteExtractionResult>;
}
