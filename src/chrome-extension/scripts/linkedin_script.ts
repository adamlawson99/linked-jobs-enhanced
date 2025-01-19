const CONFIG = {
  SELECTORS: {
    ACTIVE_ITEM: ".job-details-jobs-unified-top-card__company-name",
    PARENT_CONTAINER: ".scaffold-layout--list-detail",
    DATA_CONTAINER: ".linkedin-enhanced-data-container",
    DATA_LIST: ".linkedin-enhanced-data-list",
  },
  URLS: {
    LEVELS_FYI: {
      BASE: "https://www.levels.fyi/companies",
      SALARY_SUFFIX: "salaries/software-engineer",
      DATA_SCRIPT_TAG: "script#__NEXT_DATA__",
    },
    EXCHANGE_RATE: "https://www.bankofcanada.ca/valet/fx_rss/FXUSDCAD",
  },
  STORAGE_KEYS: {
    COMPENSATION_CACHE: "COMPENSATION_DATA_CACHE",
  },
  XML_TAGS: {
    CURRENCY_VALUE: "value",
  },
  LOCALE: {
    LEVELS_FYI_COUNTRY_MAPPINGS: {
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
    },
  },
};

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

// <---- Global Vars ---->
let compensationDataCache: CompensationDataCache = {};
let activeItemElement: HTMLElement;
let activeCompany: string;
let activeCountry: LevelsCountryConfiguration =
  CONFIG.LOCALE.LEVELS_FYI_COUNTRY_MAPPINGS["usa"];
let usdToCadExchangeRate: number;
// <---- Global Vars ---->

const waitForInitialPageLoad = () => {
  return new Promise((resolve) => {
    if (document.querySelector(CONFIG.SELECTORS.ACTIVE_ITEM)) {
      activeItemElement = document.querySelector(
        CONFIG.SELECTORS.ACTIVE_ITEM
      ) as HTMLElement;
      return resolve(document.querySelector(CONFIG.SELECTORS.ACTIVE_ITEM));
    }

    const observer = new MutationObserver((_) => {
      if (document.querySelector(CONFIG.SELECTORS.ACTIVE_ITEM)) {
        activeItemElement = document.querySelector(
          CONFIG.SELECTORS.ACTIVE_ITEM
        ) as HTMLElement;
        observer.disconnect();
        resolve(document.querySelector(CONFIG.SELECTORS.ACTIVE_ITEM));
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });
  });
};

const documentObserver = new MutationObserver((_) => {
  if (document.querySelector(CONFIG.SELECTORS.ACTIVE_ITEM)) {
    activeItemElement = document.querySelector(
      CONFIG.SELECTORS.ACTIVE_ITEM
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
  let compensationData = await getElementFromCache(
    company.companySlug,
    activeCountry.countryShortName
  );
  if (!compensationData) {
    const compensationDataUrls: string[] = getCompensationDataUrls(company);
    const compensationPromises = compensationDataUrls.map((url) =>
      getCompensationDataFromUrl(url)
    );
    const result = await Promise.all(compensationPromises);
    compensationData = result.filter((result) => result !== undefined);
  }
  setElementInCache(
    company.companySlug,
    activeCountry.countryShortName,
    compensationData
  );
  if (activeCountry.countryShortName === "canada") {
    return convertCompensationDataToCad(compensationData);
  }
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
  const responseJson = JSON.parse(responseText)["pageProps"];
  let compensationAndLevelData;
  try {
    compensationAndLevelData = {
      avgTotalCompensation:
        responseJson["companyJobFamilyLevelLocationStats"]["totalCompensation"][
          "avg"
        ],
      levelSlug: responseJson["levelSlug"],
      levelNameHumanFriendly: responseJson["level"],
    };
  } catch (err) {}
  return compensationAndLevelData;
};

const getCompensationDataUrls = (company: Company): string[] => {
  return company.levels.map((level) => {
    if (activeCountry.countryShortName === "usa") {
      return `https://www.levels.fyi/_next/data/${company.buildId}/companies/${company.companySlug}/salaries/software-engineer/levels/${level.levelSlug}.json?company=${company.companySlug}&job-family=software-engineer&level=${level.levelSlug}`;
    } else {
      return `https://www.levels.fyi/_next/data/${company.buildId}/companies/${company.companySlug}/salaries/software-engineer/levels/${level.levelSlug}/locations/${activeCountry.countryShortName}.json?company=${company.companySlug}&job-family=software-engineer&level=${level.levelSlug}&location=${activeCountry.countryShortName}`;
    }
  });
};

export const getCompanyInformationFromLevels = async (
  company: string
): Promise<Company> => {
  const companyPageUrl = buildLevelsCompanyPageUrl(company);
  const response = await fetchResource(companyPageUrl);
  if (!response.ok) {
    throw new Error(
      `Error fetching company data from Levels. Response status: ${response.status}`
    );
  }
  const responseText = await response.text();
  const responseData = extractResponseDataFromHTML(
    responseText,
    CONFIG.URLS.LEVELS_FYI.DATA_SCRIPT_TAG
  );
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

const buildLevelsCompanyPageUrl = (company: string) => {
  if (activeCountry.countryShortName === "usa") {
    return `${CONFIG.URLS.LEVELS_FYI.BASE}/${company}/${CONFIG.URLS.LEVELS_FYI.SALARY_SUFFIX}?country=${activeCountry.countryCode}`;
  } else {
    return `${CONFIG.URLS.LEVELS_FYI.BASE}/${company}/${CONFIG.URLS.LEVELS_FYI.SALARY_SUFFIX}/locations/${activeCountry.countryShortName}?country=${activeCountry.countryCode}`;
  }
};

const extractResponseDataFromHTML = (
  rawHtml: string,
  targetTag: string
): HTMLParserResult => {
  return extractResponseData(rawHtml, targetTag, "text/html");
};

const extractResponseDataFromXML = (
  rawXml: string,
  targetTag: string
): HTMLParserResult => {
  return extractResponseData(rawXml, targetTag, "text/xml");
};

const extractResponseData = (
  rawText: string,
  targetTag: string,
  type: DOMParserSupportedType
) => {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(rawText, type);

    const queryResult = doc.querySelector(targetTag);

    if (!queryResult) {
      return {
        success: false,
        content: null,
        error: "queryResult not found",
      };
    }

    const content = queryResult.textContent;

    if (!content) {
      return {
        success: false,
        content: null,
        error: "queryResult was empty",
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
      error: `Failed to parse: ${
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
    linkedInEnhancedDataContainer = createHtmlElementWithClass(
      "div",
      "linkedin-enhanced-data-container"
    );

    const linkedInEnhancedTitle = createHtmlElementWithClass(
      "h1",
      "linkedin-enhanced-title"
    );

    linkedInEnhancedTitle.innerText = "LinkedIn Jobs Enhanced";

    linkedInEnhancedDataContainer.append(linkedInEnhancedTitle);

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

  linkedInEnhancedDataList = createHtmlElementWithClass(
    "ul",
    "linkedin-enhanced-data-list"
  );

  compensationData.forEach((item: any) => {
    const li = createHtmlElementWithClass(
      "li",
      "linkedin-enhanced-data-list-item"
    );
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
  const newCountry =
    //@ts-ignore
    CONFIG.LOCALE.LEVELS_FYI_COUNTRY_MAPPINGS[selectedCountryValue];
  activeCountry = newCountry;
  refreshInformation();
};

// <----- Dropdown List OnChange ----->

// <----- Cache Helper ----->
const getElementFromCache = async (company: string, country: string) => {
  if (Object.keys(compensationDataCache).length === 0) {
    const localStorageGetResult = await chrome.storage.local.get(
      CONFIG.STORAGE_KEYS.COMPENSATION_CACHE
    );

    if (localStorageGetResult[CONFIG.STORAGE_KEYS.COMPENSATION_CACHE]) {
      compensationDataCache =
        localStorageGetResult[CONFIG.STORAGE_KEYS.COMPENSATION_CACHE];
    }
  }
  getExchangeRate();
  return compensationDataCache[company]?.[country] ?? null;
};

const setElementInCache = (
  company: string,
  country: string,
  compensationData: CompensationAndLevel[]
) => {
  if (!compensationDataCache[company]) {
    compensationDataCache[company] = {};
  }
  compensationDataCache[company][country] = compensationData;
  chrome.storage.local.set({
    [CONFIG.STORAGE_KEYS.COMPENSATION_CACHE]: compensationDataCache,
  });
};
// <----- Cache Helper ----->

// <----- Currency Conversion Helper ----->

const getExchangeRate = async (): Promise<number> => {
  const response = await fetch(CONFIG.URLS.EXCHANGE_RATE);
  if (!response.ok) {
    throw new Error(
      `Error fetching company data from Levels. Response status: ${response.status}`
    );
  }
  const responseText = await response.text();

  const responseData = extractResponseDataFromXML(
    responseText,
    CONFIG.XML_TAGS.CURRENCY_VALUE
  );
  if (!responseData.success) {
    throw new Error(`Error parsing response: ${responseData.error}`);
  }
  return parseFloat(responseData.content!);
};

interface HTMLParserResult {
  success: boolean;
  content: string | null;
  error?: string;
}

const convertCompensationDataToCad = async (
  compensationData: CompensationAndLevel[]
): Promise<CompensationAndLevel[]> => {
  if (!usdToCadExchangeRate) {
    usdToCadExchangeRate = await getExchangeRate();
  }
  return compensationData.map((compensationData) => {
    return {
      ...compensationData,
      avgTotalCompensation: Math.trunc(
        compensationData.avgTotalCompensation * usdToCadExchangeRate
      ),
    };
  });
};

// <----- Currency Conversion Helper ----->

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

// <----- Random Helpers ----->
const createHtmlElementWithClass = (
  elementType: string,
  className: string
): HTMLElement => {
  const element = document.createElement(elementType);
  element.className = className;
  return element;
};

// <----- Random Helpers ----->
