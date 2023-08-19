const RELEASE_DATE = '20230818';

const RELEASE_NOTES = `

########## RELEASE NOTES ##########
1. Implement "Ready" option in Filter UI
2. Add "Actionable" option in Filter UI
3. Tweak progress bar look & feel
`;

if (localStorage.last_release && localStorage.last_release != RELEASE_DATE.toString())
  alert(`TaskCentral update detected: ${localStorage.last_release} -> ${RELEASE_DATE}. Browser cache clear recommended.\n ${RELEASE_NOTES}`);

localStorage.last_release = RELEASE_DATE;
