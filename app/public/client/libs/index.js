const RELEASE_DATE = '20230828';

const RELEASE_NOTES = `

########## RELEASE NOTES ##########
1. Added snooze feature & filters
2. Added theme selection & auto dark mode
`;

//if (localStorage.last_release && localStorage.last_release != RELEASE_DATE.toString())
//  alert(`TaskCentral update detected: ${localStorage.last_release} -> ${RELEASE_DATE}. Browser cache clear recommended.\n ${RELEASE_NOTES}`);

localStorage.last_release = RELEASE_DATE;
