const RELEASE_DATE = '20230823R2';

const RELEASE_NOTES = `

########## RELEASE NOTES ##########
1. Add themes settings
2. Add "default-dark" theme
3. Add auto dark mode settings
`;

if (localStorage.last_release && localStorage.last_release != RELEASE_DATE.toString())
  alert(`TaskCentral update detected: ${localStorage.last_release} -> ${RELEASE_DATE}. Browser cache clear recommended.\n ${RELEASE_NOTES}`);

localStorage.last_release = RELEASE_DATE;
