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

waitForInitialPageLoad().then(() => {
  const aTag = activeItemElement.children[0] as HTMLElement;
  activeCompany = aTag.innerText.trim().toLowerCase();
  registerAfterInitialPageLoad();
});

const registerAfterInitialPageLoad = () => {
  const observer = new MutationObserver((_) => {
    const aTag = activeItemElement.children[0] as HTMLElement;
    const newActiveCompany = aTag.innerText.trim().toLowerCase();
    if(newActiveCompany === activeCompany) {
        return;
    }
    activeCompany = newActiveCompany;
  });

  observer.observe(activeItemElement, {
    childList: true,
    subtree: true,
  });
};
