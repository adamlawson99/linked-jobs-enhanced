const ACTIVE_ITEM_CLASS = ".job-details-jobs-unified-top-card__company-name";

let activeItemElement: HTMLElement;
let activeCompany: string;

const waitForInitialPageLoad = () => {
  return new Promise((resolve) => {
    if (document.querySelector(ACTIVE_ITEM_CLASS)) {
      activeItemElement = document.querySelector(
        ACTIVE_ITEM_CLASS
      ) as HTMLElement;
      return resolve(document.querySelector(ACTIVE_ITEM_CLASS));
    }

    const observer = new MutationObserver((_) => {
      if (document.querySelector(ACTIVE_ITEM_CLASS)) {
        activeItemElement = document.querySelector(
          ACTIVE_ITEM_CLASS
        ) as HTMLElement;
        observer.disconnect();
        resolve(document.querySelector(ACTIVE_ITEM_CLASS));
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });
  });
};

const documentObserver = new MutationObserver((_) => {
  if (document.querySelector(ACTIVE_ITEM_CLASS)) {
    activeItemElement = document.querySelector(
      ACTIVE_ITEM_CLASS
    ) as HTMLElement;
    registerAfterInitialPageLoad();
  }
});

documentObserver.observe(document.body, {
  childList: true,
  subtree: true,
});


waitForInitialPageLoad().then(() => {
  const aTag = activeItemElement.children[0] as HTMLElement;
  activeCompany = aTag.innerText.trim().toLowerCase();
  registerAfterInitialPageLoad();
});

const registerAfterInitialPageLoad = () => {
  const observer = new MutationObserver((_) => {
    const aTag = activeItemElement.children[0] as HTMLElement;
    const newActiveCompany = aTag.innerText.trim().toLowerCase();
    if (newActiveCompany === activeCompany) {
      return;
    }
    activeCompany = newActiveCompany;
    getCompensationDataForCompany(activeCompany).then((data) => {
      addItemToPage(data);
    });
  });

  observer.observe(activeItemElement, {
    childList: true,
    subtree: true,
  });
};

// <---- Levels FYI Helper ---->
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
  company: string
): Promise<CompensationAndLevel[]> => {
  const companyData = await getCompanyInformationFromLevels(company);
  return await getCompensationAndLevelData(companyData);
};

const getCompensationAndLevelData = async (
  company: Company
): Promise<CompensationAndLevel[]> => {
  const compensationDataUrls: string[] = getCompensationDataUrls(company);
  const compensationPromises = compensationDataUrls.map((url) =>
    getCompensationDataFromUrl(url)
  );
  const result = await Promise.all(compensationPromises);
  return result.filter((result) => result !== undefined);
};

const getCompensationDataFromUrl = async (
  url: string
): Promise<CompensationAndLevel | undefined> => {
  const response = await fetchResource(url);
  if (!response.ok) {
    throw new Error(
      `Error fetching company data from Levels. Response status: ${response.status}`
    );
  }
  const responseText = await response.text();
  const responseJson = JSON.parse(responseText);
  let compensationAndLevelData;
  try {
    compensationAndLevelData = {
      avgTotalCompensation:
        responseJson["pageProps"]["companyJobFamilyLevelLocationStats"][
          "totalCompensation"
        ]["avg"],
      levelSlug: responseJson["pageProps"]["levelSlug"],
      levelNameHumanFriendly: responseJson["pageProps"]["level"],
    };
  } catch (err) {}
  return compensationAndLevelData;
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
  const response = await fetchResource(companyPageUrl);
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

// <---- Levels FYI Helper ---->

// <---- Helper for HTTP calls ---->
const fetchResource = (
  input: string,
  init?: RequestInit
): Promise<Response> => {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage({ input, init }, (messageResponse) => {
      const [response, error] = messageResponse;
      if (response === null) {
        reject(error);
      } else {
        // Use undefined on a 204 - No Content
        const body = response.body ? new Blob([response.body]) : undefined;
        resolve(
          new Response(body, {
            status: response.status,
            statusText: response.statusText,
          })
        );
      }
    });
  });
};

const addItemToPage = (data: any) => {
  //Unload the current child if it exists
  const elem = document.querySelector(
    ".scaffold-layout--list-detail"
  ) as HTMLElement;
  const currChild = document.querySelector(".levels-fyi-data-container");
  if (currChild) {
    elem.removeChild(currChild);
  }
  const newDiv = document.createElement("div");
  // Create the <ul> element
  const ul = document.createElement("ul");

  data.forEach((item: any) => {
    const li = document.createElement("li");
    li.textContent = `Level: ${item.levelNameHumanFriendly}, Comp: ${item.avgTotalCompensation}`;
    ul.appendChild(li);
  });

  newDiv.appendChild(ul);
  newDiv.className = "levels-fyi-data-container";
  elem?.append(newDiv);
};
