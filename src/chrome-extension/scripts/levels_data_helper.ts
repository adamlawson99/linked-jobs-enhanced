// CONSTANTS
const LEVELS_FYI_SOFTWARE_ENGINEER_SALARIES_URL_PREFIX =
  "https://www.levels.fyi/companies";
const LEVELS_FYI_SOFTWARE_ENGINEER_SALARIES_URL_SUFFIX =
  "salaries/software-engineer?country=254";
// const LEVELS_FYI_DATA_URL_BASE = `${LEVELS_FYI_URL_BASE}/_next/data`
const LEVELS_DATA_SCRIPT_HTML_TAG = "script#__NEXT_DATA__";

// INTERFACES
export interface CompensationAndLevel {
  avgTotalCompensation: number;
  levelSlug: string;
  levelNameHumanFriendly: string;
}

export interface Company {
  companySlug: string;
  buildId: string;
  levels: Level[];
}

interface Level {
  levelSlug: string;
  levelNameHumanFriendly: string;
}

interface HTMLParserResult {
  success: boolean;
  content: string | null;
  error?: string;
}

export const getCompensationDataForCompany = async (
  company: Company
): Promise<CompensationAndLevel[]> => {
  return await getCompensationAndLevelData(company);
};

const getCompensationAndLevelData = async (
  company: Company
): Promise<CompensationAndLevel[]> => {
  const compensationDataUrls: string[] = getCompensationDataUrls(company);
  const compensationPromises = compensationDataUrls.map((url) =>
    getCompensationDataFromUrl(url)
  );
  return Promise.all(compensationPromises);
};

const getCompensationDataFromUrl = async (
  url: string
): Promise<CompensationAndLevel> => {
  console.log(`FETCHING DATA FOR: ${url}`);
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(
      `Error fetching company data from Levels. Response status: ${response.status}`
    );
  }
  const responseText = await response.text();
  const responseJson = JSON.parse(responseText);
  return {
    avgTotalCompensation:
      responseJson["pageProps"]["companyJobFamilyLevelLocationStats"][
        "totalCompensation"
      ]["avg"],
    levelSlug: responseJson["pageProps"]["levelSlug"],
    levelNameHumanFriendly: responseJson["pageProps"]["level"],
  };
};

const getCompensationDataUrls = (company: Company): string[] => {
  return company.levels.map((level) => {
    return `https://www.levels.fyi/_next/data/${company.buildId}/companies/${company.companySlug}/salaries/software-engineer/levels/${level.levelSlug}.json?company=${company.companySlug}&job-family=software-engineer&level=${level.levelSlug}`;
  });
};

export const getCompanyInformationFromLevels = async (
  company: string
): Promise<Company> => {
  const companyPageUrl = `${LEVELS_FYI_SOFTWARE_ENGINEER_SALARIES_URL_PREFIX}/${company}/${LEVELS_FYI_SOFTWARE_ENGINEER_SALARIES_URL_SUFFIX}`;
  const response = await fetch(companyPageUrl);
  if (!response.ok) {
    throw new Error(
      `Error fetching company data from Levels. Response status: ${response.status}`
    );
  }
  const responseText = await response.text();
  const responseData = extractResponseData(responseText);
  if (!responseData.success) {
    throw new Error(`Error parsing response: ${responseData.error}`);
  }
  const responseJson = JSON.parse(responseData.content!);
  return {
    companySlug: responseJson["props"]["pageProps"]["company"]["slug"],
    buildId: responseJson["buildId"],
    levels: getLevelsFromJson(responseJson),
  };
};

const extractResponseData = (htmlString: string): HTMLParserResult => {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlString, "text/html");

    const scriptTag = doc.querySelector(LEVELS_DATA_SCRIPT_HTML_TAG);

    if (!scriptTag) {
      return {
        success: false,
        content: null,
        error: "Data script tag not found in HTML",
      };
    }

    const content = scriptTag.textContent;

    if (!content) {
      return {
        success: false,
        content: null,
        error: "Data script tag was empty",
      };
    }

    return {
      success: true,
      content: content,
    };
  } catch (error) {
    return {
      success: false,
      content: null,
      error: `Failed to parse HTML: ${
        error instanceof Error ? error.message : "Unknown error"
      }`,
    };
  }
};

// JSON Helpers
const getLevelsFromJson = (responseJson: any): Level[] => {
  const allLevelsRawData =
    responseJson["props"]["pageProps"]["levels"]["levels"];
  return allLevelsRawData.map((level: any) => {
    return {
      levelSlug: level["titleSlugs"][0],
      levelNameHumanFriendly: level["titles"][0],
    };
  });
};
