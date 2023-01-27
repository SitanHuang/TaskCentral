const RELEASE_DATE = '20230127R4';

const RELEASE_NOTES = `
1. Bottom status bar is reworked on Ready mode & shows a progress bar
2. User panel allows for customizing color scheme
`;

if (localStorage.last_release && localStorage.last_release != RELEASE_DATE.toString())
  alert(`TaskCentral update detected: ${localStorage.last_release} -> ${RELEASE_DATE}. Changes may apply. Browser cache clear recommended.\nRelease Notes: ${RELEASE_NOTES}`);

localStorage.last_release = RELEASE_DATE;
