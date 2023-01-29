const RELEASE_DATE = '20230129R1';

const RELEASE_NOTES = `

########## RELEASE NOTES ##########
1. Added task progress value & step indicator
`;

if (localStorage.last_release && localStorage.last_release != RELEASE_DATE.toString())
  alert(`TaskCentral update detected: ${localStorage.last_release} -> ${RELEASE_DATE}. Browser cache clear recommended.\n ${RELEASE_NOTES}`);

localStorage.last_release = RELEASE_DATE;
