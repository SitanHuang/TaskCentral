const RELEASE_DATE = '20230903R1';

const RELEASE_NOTES = `
########## RELEASE NOTES ##########
1. Fix bug where thread blocking confirm dialog causes server syncs to fail (ie. when deleting tasks).

--------- PREVIOUS NOTES ----------
1. Add Skill Groups in Metrics
`;

if (localStorage.last_release && localStorage.last_release != RELEASE_DATE.toString())
  alert(`TaskCentral update detected: ${localStorage.last_release} -> ${RELEASE_DATE}. Browser cache clear recommended.\n ${RELEASE_NOTES}`);

localStorage.last_release = RELEASE_DATE;
