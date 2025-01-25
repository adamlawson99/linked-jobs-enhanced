# LinkedIn Jobs Enhanced Chrome Extension

This Chrome extension enhances your LinkedIn Jobs page by adding extra information to job listings.

## Features

- Displays role and compensation information for companies using data from levels.fyi
- Draggable window displays information alongside the currently selected job listing
- Shows compensation from Canada and the united states, with support for USD and CAD currencies

## Planned Features (Coming Soon)

- More robust company name matching against levels.fyi data
- Options page to configure defaults, view cached data, and manually specify links or data for companies not found in levels.fyi
- Data from teamblind and glassdoor showing reviews for a company
- And more!

## Screenshots

**Display level and compensation data for the United States**
![screenshot-usa-job-information](/screenshots/united-states.png)

**Display level and compensation data for Canada**
![screenshot-canada-job-information](/screenshots/canada-usd.png)

**Display level and compensation data for Canada in Canadian dollars**
![screenshot-canada-in-cad-job-information](/screenshots/canada-cad.png)

## Installation

### Prerequisites

- Google Chrome or Chromium-based browsers.

### Steps to Install:

1. Clone this repository
2. Following the instructions https://developer.chrome.com/docs/extensions/get-started/tutorial/hello-world#load-unpacked to load the unpacked extension
3. Go to the LinkedIn jobs search page https://www.linkedin.com/jobs/search/ and begin searching for jobs
4. The extension will automatically fetch data from levels.fyi and display it on the page

### Resources Used

[chrome-extension-starter ](https://github.com/omribarmats/chrome-extension-starter)
