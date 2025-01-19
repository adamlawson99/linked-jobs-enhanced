// <---- Interfaces ---->
interface CompensationAndLevel {
  avgTotalCompensation: number;
  levelSlug: string;
  levelNameHumanFriendly: string;
}

interface Company {
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

interface LevelsCountryConfiguration {
  countryCode: number;
  countryShortName: string;
  countryHumanFriendlyName: string;
}

interface CompensationDataCache {
  [company: string]: {
    [country: string]: CompensationAndLevel[];
  };
}

// <---- Interfaces ---->

// <---- Constants ---->
const ACTIVE_ITEM_CLASS = ".job-details-jobs-unified-top-card__company-name";
const LEVELS_FYI_SOFTWARE_ENGINEER_SALARIES_URL_PREFIX =
  "https://www.levels.fyi/companies";
const LEVELS_FYI_SOFTWARE_ENGINEER_SALARIES_URL_SUFFIX =
  "salaries/software-engineer";
// const LEVELS_FYI_DATA_URL_BASE = `${LEVELS_FYI_URL_BASE}/_next/data`
const LEVELS_DATA_SCRIPT_HTML_TAG = "script#__NEXT_DATA__";
const LEVELS_FYI_COUNTRY_MAPPINGS: {
  [key: string]: LevelsCountryConfiguration;
} = {
  canada: {
    countryCode: 43,
    countryShortName: "canada",
    countryHumanFriendlyName: "Canada",
  },
  usa: {
    countryCode: 254,
    countryShortName: "usa",
    countryHumanFriendlyName: "United States",
  },
};
const COMPENSATION_DATA_CACHE: CompensationDataCache = {};

// <---- Constants ---->

// <---- Global Vars ---->
let activeItemElement: HTMLElement;
let activeCompany: string;
let activeCountry: LevelsCountryConfiguration =
  LEVELS_FYI_COUNTRY_MAPPINGS["usa"];
// <---- Global Vars ---->

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
  refreshInformation();
});

const registerAfterInitialPageLoad = () => {
  const observer = new MutationObserver((_) => {
    const aTag = activeItemElement.children[0] as HTMLElement;
    const newActiveCompany = aTag.innerText.trim().toLowerCase();
    if (newActiveCompany === activeCompany) {
      return;
    }
    activeCompany = newActiveCompany;
    refreshInformation();
  });

  observer.observe(activeItemElement, {
    childList: true,
    subtree: true,
  });
};

// <---- Levels FYI Helper ---->

export const getCompensationDataForCompany = async (
  company: string
): Promise<CompensationAndLevel[]> => {
  const companyData = await getCompanyInformationFromLevels(company);
  return await getCompensationAndLevelData(companyData);
};

const getCompensationAndLevelData = async (
  company: Company
): Promise<CompensationAndLevel[]> => {
  const cachedCompensationData = getElementFromCache(
    company.companySlug,
    activeCountry.countryShortName
  );
  if (cachedCompensationData) {
    return cachedCompensationData;
  }
  const compensationDataUrls: string[] = getCompensationDataUrls(company);
  const compensationPromises = compensationDataUrls.map((url) =>
    getCompensationDataFromUrl(url)
  );
  const result = await Promise.all(compensationPromises);
  const compensationData = result.filter((result) => result !== undefined);
  setElementInCache(
    company.companySlug,
    activeCountry.countryShortName,
    compensationData
  );
  return compensationData;
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
    let compensationDataUrl = `https://www.levels.fyi/_next/data/${company.buildId}/companies/${company.companySlug}/salaries/software-engineer/levels/${level.levelSlug}`;
    if (activeCountry.countryShortName !== "usa") {
      compensationDataUrl = `${compensationDataUrl}/locations/${activeCountry.countryShortName}`;
    }
    compensationDataUrl = `${compensationDataUrl}.json?company=${company.companySlug}&job-family=software-engineer&level=${level.levelSlug}`;
    if (activeCountry.countryShortName !== "usa") {
      compensationDataUrl = `${compensationDataUrl}&location=${activeCountry.countryShortName}`;
    }
    return compensationDataUrl;
  });
};

export const getCompanyInformationFromLevels = async (
  company: string
): Promise<Company> => {
  let companyPageUrl = `${LEVELS_FYI_SOFTWARE_ENGINEER_SALARIES_URL_PREFIX}/${company}/${LEVELS_FYI_SOFTWARE_ENGINEER_SALARIES_URL_SUFFIX}`;
  if (activeCountry.countryShortName !== "usa") {
    companyPageUrl = `${companyPageUrl}/locations/${activeCountry.countryShortName}`;
  }
  companyPageUrl = `${companyPageUrl}?country=${activeCountry.countryCode}`;
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

const loadLinkedInEnhancedWidget = () => {
  //Unload the current child if it exists
  const parentElementTarget = document.querySelector(
    ".scaffold-layout--list-detail"
  ) as HTMLElement;

  // Create the data container if it doesn't exists
  let linkedInEnhancedDataContainer = document.querySelector(
    ".linkedin-enhanced-data-container"
  ) as HTMLElement;
  if (!linkedInEnhancedDataContainer) {
    linkedInEnhancedDataContainer = document.createElement("div");
    const linkedInEnhancedTitle = document.createElement("h1");
    linkedInEnhancedTitle.innerText = "LinkedIn Jobs Enhanced";
    linkedInEnhancedTitle.className = "linkedin-enhanced-title";
    linkedInEnhancedDataContainer.append(linkedInEnhancedTitle);
    linkedInEnhancedDataContainer.className =
      "linkedin-enhanced-data-container";
    parentElementTarget.append(linkedInEnhancedDataContainer);

    // Make the element draggable
    dragElement(linkedInEnhancedDataContainer);

    // Add the country select dropdown
    linkedInEnhancedDataContainer.appendChild(getCountrySelectDropdown());
  }
  return linkedInEnhancedDataContainer;
};

const refreshInformation = async () => {
  const compensationData = await getCompensationDataForCompany(activeCompany);
  // Create the data container if it doesn't exists
  let linkedInEnhancedDataContainer = document.querySelector(
    ".linkedin-enhanced-data-container"
  ) as HTMLElement;
  if (!linkedInEnhancedDataContainer) {
    linkedInEnhancedDataContainer = loadLinkedInEnhancedWidget();
  }
  // Unload the current list if present
  let linkedInEnhancedDataList = document.querySelector(
    ".linkedin-enhanced-data-list"
  ) as HTMLElement;
  if (linkedInEnhancedDataList) {
    linkedInEnhancedDataContainer.removeChild(linkedInEnhancedDataList);
  }

  linkedInEnhancedDataList = document.createElement("ul");
  linkedInEnhancedDataList.className = "linkedin-enhanced-data-list";

  compensationData.forEach((item: any) => {
    const li = document.createElement("li");
    li.className = "linkedin-enhanced-data-list-item";
    li.textContent = `Level: ${item.levelNameHumanFriendly}, Comp: ${item.avgTotalCompensation}`;
    linkedInEnhancedDataList.appendChild(li);
  });
  linkedInEnhancedDataContainer.appendChild(linkedInEnhancedDataList);
};

// <----- Dropdown List ----->
const getCountrySelectDropdown = (): HTMLSelectElement => {
  const countrySelect = document.createElement("select");
  countrySelect.className = "linkedin-enhanced-country-select";
  const usaChild: HTMLOptionElement = document.createElement("option");
  usaChild.value = "usa";
  usaChild.textContent = "United States";
  countrySelect.appendChild(usaChild);

  const canadaChild: HTMLOptionElement = document.createElement("option");
  canadaChild.value = "canada";
  canadaChild.textContent = "Canada";
  countrySelect.appendChild(canadaChild);
  countrySelect.addEventListener("change", onCountrySelectChange);
  return countrySelect;
};

const onCountrySelectChange = (event: Event) => {
  const selectElement = event.target as HTMLSelectElement;
  const selectedCountryValue = selectElement.value;
  const newCountry = LEVELS_FYI_COUNTRY_MAPPINGS[selectedCountryValue];
  activeCountry = newCountry;
  refreshInformation();
};

// <----- Dropdown List OnChange ----->

// <----- Draggable Info Box ----->
const dragElement = (element: HTMLElement) => {
  var pos1 = 0,
    pos2 = 0,
    pos3 = 0,
    pos4 = 0;
  element.onmousedown = dragMouseDown;
  function dragMouseDown(event: MouseEvent) {
    if (event.target instanceof HTMLSelectElement) {
      return;
    }
    event.preventDefault();
    // get the mouse cursor position at startup:
    pos3 = event.clientX;
    pos4 = event.clientY;
    document.onmouseup = closeDragElement;
    // call a function whenever the cursor moves:
    document.onmousemove = elementDrag;
  }

  function elementDrag(event: MouseEvent) {
    event.preventDefault();
    // calculate the new cursor position:
    pos1 = pos3 - event.clientX;
    pos2 = pos4 - event.clientY;
    pos3 = event.clientX;
    pos4 = event.clientY;
    // set the element's new position:
    element.style.top = element.offsetTop - pos2 + "px";
    element.style.left = element.offsetLeft - pos1 + "px";
  }

  function closeDragElement() {
    // stop moving when mouse button is released:
    document.onmouseup = null;
    document.onmousemove = null;
  }
};
// <----- Draggable Info Box ----->

// <----- Cache Helper ----->
const getElementFromCache = (company: string, country: string) => {
  return COMPENSATION_DATA_CACHE[company]?.[country] ?? null;
};

const setElementInCache = (
  company: string,
  country: string,
  compensationData: CompensationAndLevel[]
) => {
  if (!COMPENSATION_DATA_CACHE?.[company]) {
    COMPENSATION_DATA_CACHE[company] = {};
  }
  COMPENSATION_DATA_CACHE[company][country] = compensationData;
};

// <----- Cache Helper ----->
