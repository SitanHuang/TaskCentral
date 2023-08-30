const RELEASE_DATE = '20230830';

const RELEASE_NOTES = `

########## RELEASE NOTES ##########
1. Fulfill request to move snooze button
`;

if (localStorage.last_release && localStorage.last_release != RELEASE_DATE.toString())
  alert(`TaskCentral update detected: ${localStorage.last_release} -> ${RELEASE_DATE}. Browser cache clear recommended.\n ${RELEASE_NOTES}`);

localStorage.last_release = RELEASE_DATE;
