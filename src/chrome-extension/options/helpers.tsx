import { CompanyData, CompanyIdCache } from "./types";

const COMPANY_ID_CACHE = "COMPANY_ID_CACHE";

export const getCompanyDataForTable = async (): Promise<CompanyData[]> => {
  let companyIdCache = {};
  const localStorageGetResult = await chrome.storage.local.get(
    COMPANY_ID_CACHE
  );

  if (localStorageGetResult[COMPANY_ID_CACHE]) {
    companyIdCache = localStorageGetResult[COMPANY_ID_CACHE];
  }
  if (!companyIdCache || Object.keys(companyIdCache).length === 0) {
    return [];
  }

  companyIdCache = companyIdCache as CompanyIdCache;

  const result: CompanyData[] = [];

  Object.keys(companyIdCache).forEach((key) => {
    //@ts-ignore
    const cacheData = companyIdCache[key];
    const companyData: CompanyData = {
      companyName: key,
      ...cacheData,
    };
    result.push(companyData);
  });

  return result;
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
