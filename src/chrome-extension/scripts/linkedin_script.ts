try {
} catch (err) {
  console.log(err);
}
// <---- Enums ---->
enum Currency {
  CAD = "CAD",
  USD = "USD",
}
// <---- Enums ---->

const CONFIG = {
  CLASSES: {
    ACTIVE_ITEM: "job-details-jobs-unified-top-card__company-name",
    PARENT_CONTAINER: "scaffold-layout--list-detail",
    DATA_CONTAINER: "linkedin-enhanced-data-container",
    DATA_CONTAINER_TITLE: "linkedin-enhanced-title",
    COUNTRY_SELECTOR: "linkedin-enhanced-country-select",
    CURRENCY_SELECTOR: "linkedin-enhanced-currency-select",
    LOADING_SPINNER: "linkedin-enhanced-loading-container",
    SELECT_DIV: "linkedin-enhanced-select-div",
    SELECT_ITEM_TITLE: "linkedin-enhanced-select-item-title",
    COMP_DATA_TABLE: "linkedin-enhanced-table",
    COMPANY_INFO: "linkedin-enhanced-company-info",
    COMPANY_INFO_TITLE: "linkedin-enhanced-company-info-title",
    COMPANY_INFO_LINK: "linkedin-enhanced-company-info-link",
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
        currency: Currency.CAD,
      },
      usa: {
        countryCode: 254,
        countryShortName: "usa",
        countryHumanFriendlyName: "United States",
        currency: Currency.USD,
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
let displayCurrency: Currency = Currency.USD;
// <---- Global Vars ---->

const documentObserver = new MutationObserver((_) => {
  if (getElementByClassName(CONFIG.CLASSES.ACTIVE_ITEM)) {
    activeItemElement = getElementByClassName(
      CONFIG.CLASSES.ACTIVE_ITEM
    ) as HTMLElement;
    registerAfterInitialPageLoad();
  }
});

documentObserver.observe(document.body, {
  childList: true,
  subtree: true,
});

const registerAfterInitialPageLoad = () => {
  if (!activeItemElement || activeItemElement.children.length === 0) {
    return;
  }
  const observer = new MutationObserver((_) => {
    const aTag = activeItemElement.children[0] as HTMLElement;
    const newActiveCompany = aTag.innerText.trim().toLowerCase();
    if (activeCompany && newActiveCompany === activeCompany) {
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

const getCompanyData = async (company: string): Promise<Company> => {
  return await getCompanyInformationFromLevels(company);
};

const getCompensationDataForCompany = async (
  company: Company
): Promise<CompensationAndLevel[]> => {
  const compensationDataFromCache = await getCompensationAndLevelDataFromCache(
    company
  );
  if (compensationDataFromCache) {
    return compensationDataFromCache;
  }
  updateContainerBeforeDataLoad();
  const compensationData = await getCompensationAndLevelData(company);
  updateContainerAfterDataLoad();
  return compensationData;
};

const getCompensationAndLevelDataFromCache = async (
  company: Company
): Promise<CompensationAndLevel[]> => {
  const compensationData = await getElementFromCache(
    company.companySlug,
    activeCountry.countryShortName
  );
  if (compensationData && displayCurrency === Currency.CAD) {
    return convertCompensationDataToCad(compensationData);
  }
  return compensationData;
};

const getCompensationAndLevelData = async (
  company: Company
): Promise<CompensationAndLevel[]> => {
  let compensationData = await getElementFromCache(
    company.companySlug,
    activeCountry.countryShortName
  );

  const compensationDataUrls: string[] = getCompensationDataUrls(company);
  const compensationPromises = compensationDataUrls.map((url) =>
    getCompensationDataFromUrl(url)
  );
  const result = await Promise.all(compensationPromises);
  compensationData = result.filter((result) => result != null);
  setElementInCache(
    company.companySlug,
    activeCountry.countryShortName,
    compensationData
  );
  if (displayCurrency === Currency.CAD) {
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
  const responseJson = JSON.parse(responseText);
  let compensationAndLevelData;
  try {
    compensationAndLevelData = {
      avgTotalCompensation: getFieldFromJsonObject(
        responseJson,
        "pageProps",
        "companyJobFamilyLevelLocationStats",
        "totalCompensation",
        "avg"
      ),
      levelSlug: getFieldFromJsonObject(responseJson, "pageProps", "levelSlug"),
      levelNameHumanFriendly: getFieldFromJsonObject(
        responseJson,
        "pageProps",
        "level"
      ),
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

const getCompanyInformationFromLevels = async (
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
    companySlug: getFieldFromJsonObject(
      responseJson,
      "props",
      "pageProps",
      "company",
      "slug"
    ),
    buildId: getFieldFromJsonObject(responseJson, "buildId"),
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
  const allLevelsRawData = getFieldFromJsonObject(
    responseJson,
    "props",
    "pageProps",
    "levels",
    "levels"
  );
  return allLevelsRawData.map((level: any) => {
    return {
      levelSlug: getFieldFromJsonObject(level, "titleSlugs")[0],
      levelNameHumanFriendly: getFieldFromJsonObject(level, "titles")[0],
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
  const parentElementTarget = getElementByClassName(
    "scaffold-layout--list-detail"
  ) as HTMLElement;

  // Create the data container if it doesn't exists
  let linkedInEnhancedDataContainer = getElementByClassName(
    CONFIG.CLASSES.DATA_CONTAINER
  ) as HTMLElement;
  if (!linkedInEnhancedDataContainer) {
    linkedInEnhancedDataContainer = createHtmlElementWithClass(
      "div",
      CONFIG.CLASSES.DATA_CONTAINER
    );

    const linkedInEnhancedTitle = createHtmlElementWithClass(
      "h1",
      CONFIG.CLASSES.DATA_CONTAINER_TITLE
    );

    linkedInEnhancedTitle.innerText = "LinkedIn Jobs Enhanced";

    linkedInEnhancedDataContainer.append(linkedInEnhancedTitle);

    parentElementTarget.append(linkedInEnhancedDataContainer);

    // Make the element draggable
    dragElement(linkedInEnhancedDataContainer);

    // Add the country select dropdown
    linkedInEnhancedDataContainer.appendChild(getCountrySelectDropdown());

    // Add the currency select dropdown
    linkedInEnhancedDataContainer.appendChild(getCurrencySelectDropdown());

    // Add the loading spinner to the dropdown
    linkedInEnhancedDataContainer.appendChild(getLoadingSpinner());
  }
  return linkedInEnhancedDataContainer;
};

const refreshInformation = async () => {
  const linkedInEnhancedDataContainer = loadLinkedInEnhancedWidget();
  const companyData = await getCompanyData(activeCompany);
  const compensationData = await getCompensationDataForCompany(companyData);

  // Unload the current table if present
  let linkedInEnhancedDataTable = getElementByClassName(
    CONFIG.CLASSES.COMP_DATA_TABLE
  ) as HTMLElement;
  if (linkedInEnhancedDataTable) {
    linkedInEnhancedDataContainer.removeChild(linkedInEnhancedDataTable);
  }

  //unload the company info div if present
  let companyInfoDiv = getElementByClassName(
    CONFIG.CLASSES.COMPANY_INFO
  ) as HTMLElement;
  if (companyInfoDiv) {
    linkedInEnhancedDataContainer.removeChild(companyInfoDiv);
  }
  companyInfoDiv = getCompanyInfoDiv(companyData);
  linkedInEnhancedDataContainer.appendChild(companyInfoDiv);

  linkedInEnhancedDataTable = getCompensationDataTable(compensationData);
  linkedInEnhancedDataContainer.appendChild(linkedInEnhancedDataTable);
};

// <----- Compensation Data Table ----->
const getCompensationDataTable = (compensationData: CompensationAndLevel[]) => {
  const compDataTable = createHtmlElementWithClass(
    "table",
    CONFIG.CLASSES.COMP_DATA_TABLE
  );
  const compDataTableHead = document.createElement("thead");
  const compDataTableHeadRow = document.createElement("tr");
  compDataTableHead.appendChild(compDataTableHeadRow);
  const compDataTableHeadHeaderLevel = document.createElement("th");
  compDataTableHeadHeaderLevel.innerText = "Level";
  compDataTableHeadRow.appendChild(compDataTableHeadHeaderLevel);
  const compDataTableHeadHeaderCompensation = document.createElement("th");
  compDataTableHeadHeaderCompensation.innerText = "Compensation";
  compDataTableHeadRow.appendChild(compDataTableHeadHeaderCompensation);

  compDataTable.appendChild(compDataTableHead);

  const compDataTableBody = document.createElement("tbody");
  compDataTable.appendChild(compDataTableBody);
  compensationData.forEach((item: any) => {
    const compDataTableBodyRow = document.createElement("tr");
    const compDataTableBodyLevelName = document.createElement("td");
    compDataTableBodyLevelName.innerText = `${item.levelNameHumanFriendly}`;
    compDataTableBodyRow.appendChild(compDataTableBodyLevelName);
    const compDataTableBodyTotalCompensation = document.createElement("td");
    compDataTableBodyTotalCompensation.innerText = `${item.avgTotalCompensation}`;
    compDataTableBodyRow.appendChild(compDataTableBodyTotalCompensation);
    compDataTableBody.appendChild(compDataTableBodyRow);
  });
  return compDataTable;
};

// <----- Compensation Data Table ----->

// <---- Company Info Div ---->
const getCompanyInfoDiv = (company: Company): HTMLElement => {
  const companyInfoContainer = createHtmlElementWithClass(
    "div",
    CONFIG.CLASSES.COMPANY_INFO
  );
  const companyNameTitle = createHtmlElementWithClass(
    "h1",
    CONFIG.CLASSES.COMPANY_INFO_TITLE
  );
  companyNameTitle.innerText = "Company";
  companyInfoContainer.appendChild(companyNameTitle);

  const companyLink = createHtmlElementWithClass(
    "a",
    CONFIG.CLASSES.COMPANY_INFO_LINK
  ) as HTMLAnchorElement;
  companyLink.href = buildLevelsCompanyPageUrl(company.companySlug);
  companyLink.target = "_blank";
  companyLink.textContent = `${company.companySlug}`;
  companyInfoContainer.appendChild(companyLink);
  return companyInfoContainer;
};

// <----- Dropdown Lists ----->
const getCountrySelectDropdown = (): HTMLElement => {
  const linkedinEnhancedSelectDiv = createHtmlElementWithClass(
    "div",
    CONFIG.CLASSES.SELECT_DIV
  );

  const countrySelectTitle = createHtmlElementWithClass(
    "h1",
    CONFIG.CLASSES.SELECT_ITEM_TITLE
  );

  countrySelectTitle.innerText = "Country";

  linkedinEnhancedSelectDiv.appendChild(countrySelectTitle);

  const countrySelect = createHtmlElementWithClass(
    "select",
    CONFIG.CLASSES.COUNTRY_SELECTOR
  ) as HTMLSelectElement;

  linkedinEnhancedSelectDiv.appendChild(countrySelect);

  const usaChild: HTMLOptionElement = document.createElement("option");
  usaChild.value = "usa";
  usaChild.textContent = "United States";
  countrySelect.appendChild(usaChild);

  const canadaChild: HTMLOptionElement = document.createElement("option");
  canadaChild.value = "canada";
  canadaChild.textContent = "Canada";
  countrySelect.appendChild(canadaChild);
  countrySelect.addEventListener("change", onCountrySelectChange);
  return linkedinEnhancedSelectDiv;
};

const getCurrencySelectDropdown = (): HTMLElement => {
  const linkedinEnhancedSelectDiv = createHtmlElementWithClass(
    "div",
    CONFIG.CLASSES.SELECT_DIV
  );

  const currencySelectTitle = createHtmlElementWithClass(
    "h1",
    CONFIG.CLASSES.SELECT_ITEM_TITLE
  );

  currencySelectTitle.innerText = "Display Currency";

  linkedinEnhancedSelectDiv.appendChild(currencySelectTitle);

  const countrySelect = createHtmlElementWithClass(
    "select",
    CONFIG.CLASSES.CURRENCY_SELECTOR
  ) as HTMLSelectElement;

  linkedinEnhancedSelectDiv.appendChild(countrySelect);

  const usdChild: HTMLOptionElement = document.createElement("option");
  usdChild.value = "USD";
  usdChild.textContent = "USD";
  countrySelect.appendChild(usdChild);

  const cadChild: HTMLOptionElement = document.createElement("option");
  cadChild.value = "CAD";
  cadChild.textContent = "CAD";
  countrySelect.appendChild(cadChild);
  countrySelect.addEventListener("change", onCurrencySelectChange);

  return linkedinEnhancedSelectDiv;
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

const onCurrencySelectChange = (event: Event) => {
  const selectElement = event.target as HTMLSelectElement;
  const selectedCurrencyValue = selectElement.value;
  //@ts-ignore
  displayCurrency = Currency[selectedCurrencyValue];
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

const getFieldFromJsonObject = (jsonObject: any, ...fields: string[]) => {
  let result;
  let currentJsonObject = jsonObject;
  for (let field of fields) {
    result = currentJsonObject[field];
    currentJsonObject = currentJsonObject[field];
  }
  return result;
};

const getLoadingSpinner = (): HTMLElement => {
  const loadingDiv = createHtmlElementWithClass(
    "div",
    "linkedin-enhanced-loading-container"
  );
  const loadingSpinner = createHtmlElementWithClass(
    "div",
    "linkedin-enhanced-spinner"
  );
  const loadingText = createHtmlElementWithClass(
    "div",
    "linkedin-enhanced-loading-text"
  );

  loadingText.innerText = "Loading";
  loadingDiv.appendChild(loadingText);
  loadingDiv.appendChild(loadingSpinner);
  return loadingDiv;
};

const updateContainerBeforeDataLoad = () => {
  hideItemIfExists(CONFIG.CLASSES.COMP_DATA_TABLE);
  hideItemIfExists(CONFIG.CLASSES.COMPANY_INFO);

  showItemIfExists(CONFIG.CLASSES.LOADING_SPINNER);
};

const updateContainerAfterDataLoad = () => {
  hideItemIfExists(CONFIG.CLASSES.LOADING_SPINNER);

  showItemIfExists(CONFIG.CLASSES.COMP_DATA_TABLE);
  showItemIfExists(CONFIG.CLASSES.COMPANY_INFO);
};

const showItemIfExists = (className: string) => {
  const element = getElementByClassName(className) as HTMLElement;
  if (!element) {
    return;
  }
  element.style.display = "flex";
};

const hideItemIfExists = (className: string) => {
  const element = getElementByClassName(className) as HTMLElement;
  if (!element) {
    return;
  }
  element.style.display = "none";
};

const getElementByClassName = (className: string): HTMLElement => {
  return document.querySelector(`.${className}`) as HTMLElement;
};

// <----- Random Helpers ----->
