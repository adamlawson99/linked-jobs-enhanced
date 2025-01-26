# LinkedIn Jobs Enhanced Chrome Extension

This Chrome extension enhances your LinkedIn Jobs page by adding extra information to job listings.

## Features

- Displays role and compensation information for companies using data from levels.fyi
- Draggable window displays information alongside the currently selected job listing
- Shows compensation from Canada and the united states, with support for USD and CAD currencies

## Planned Features (Coming Soon)

- More robust company name matching against levels.fyi data
- Data from teamblind and glassdoor showing reviews for a company
- And more!

## Settings

- From the setting page you can edit the company name and company id from job positings you've viewed. The company name is matched against the title in the job posting and the company id is used to find the company on levels.fyi
  ![screenshot-settings-page](/screenshots/settings-page.png)

## Screenshots

**Display level and compensation data for the United States**
![screenshot-usa-job-information](/screenshots/united-states.png)

**Display level and compensation data for Canada**
![screenshot-canada-job-information](/screenshots/canada-usd.png)

**Display level and compensation data for Canada in Canadian dollars**
![screenshot-canada-in-cad-job-information](/screenshots/canada-cad.png)

**Edit company name and id information**
![screenshot-settings-page](/screenshots/settings-page.png)

## Installation

### Prerequisites

- Google Chrome or Chromium-based browsers
- NodeJS >= V22

### Steps to Install:

1. Clone this repository
2. Build the project `cd linked-jobs-enhanced && npm run build`
3. Following the instructions https://developer.chrome.com/docs/extensions/get-started/tutorial/hello-world#load-unpacked to load the unpacked extension
4. Go to the LinkedIn jobs search page https://www.linkedin.com/jobs/search/ and begin searching for jobs
5. The extension will automatically fetch data from levels.fyi and display it on the page

## FAQs/Troubleshooting

### Error fetching data for company [X]

Sometimes the company name on the job posting and the company id on levels.fyi don't match. For example, a job posting with the company name "My Awesome Company (Canada)" might have the company id "my-awesome-company" on levels.fyi. To find the company id, go to levels.fyi and search for the company page. The company page will have a url like: `https://www.levels.fyi/companies/<company-id>`, where the last part of the url is the company id.

- Find the company id from levels.fyi
- Go to the settings page
- Update the company id with the company id retrieved from levels.fyi
- Save the changes
- Reload the LinkedIn jobs page

### Resources Used

[chrome-extension-starter ](https://github.com/omribarmats/chrome-extension-starter)
