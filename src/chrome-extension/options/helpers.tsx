import { CompanyData, CompanyIdCache } from "./types";

const COMPANY_ID_CACHE = "COMPANY_ID_CACHE";

export const getCompanyDataForTable = async (): Promise<CompanyData[]> => {
  const result = await chrome.storage.local.get(COMPANY_ID_CACHE);

  const companyIdCache = result[COMPANY_ID_CACHE] as CompanyIdCache | undefined;

  if (!companyIdCache || Object.keys(companyIdCache).length === 0) {
    return [];
  }

  return Object.entries(companyIdCache).map(([companyName, cacheData]) => ({
    companyName,
    ...cacheData,
  }));
};

export const saveTableDataToCache = (companyData: CompanyData[]) => {
  const companyIdCache = companyData.reduce((cache, company) => {
    const trimmedName = company.companyName.trim();

    cache[trimmedName] = {
      companyId: company.companyId?.trim(),
      lastFetchSuccess: company.lastFetchSuccess,
    };

    return cache;
  }, {} as CompanyIdCache);
  chrome.storage.local.set({
    [COMPANY_ID_CACHE]: companyIdCache,
  });
};
