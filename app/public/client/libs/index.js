const RELEASE_DATE = '20230823R4';

const RELEASE_NOTES = `

########## RELEASE NOTES ##########
1. Add Pink, Solarized, Nord themes
2. Add themes settings
3. Add auto dark mode settings
`;

if (localStorage.last_release && localStorage.last_release != RELEASE_DATE.toString())
  alert(`TaskCentral update detected: ${localStorage.last_release} -> ${RELEASE_DATE}. Browser cache clear recommended.\n ${RELEASE_NOTES}`);

localStorage.last_release = RELEASE_DATE;
