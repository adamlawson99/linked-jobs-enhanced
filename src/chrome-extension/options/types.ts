export type CompanyData = {
  companyName: string;
  companyId?: string;
  lastFetchSuccess: boolean;
};

export interface CompanyIdCache {
  [companyName: string]: {
    companyId?: string;
    lastFetchSuccess: boolean;
  };
}
