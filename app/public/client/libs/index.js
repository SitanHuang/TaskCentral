const RELEASE_DATE = '20230905';

const RELEASE_NOTES = `
########## RELEASE NOTES ##########
1. Fix auto dark mode on 6a/6p setting doesn't work until refreshed

--------- PREVIOUS NOTES ----------
1. Fix bug where thread blocking confirm dialog causes server syncs to fail (ie. when deleting tasks).
2. Add Skill Groups in Metrics
`;

if (localStorage.last_release && localStorage.last_release != RELEASE_DATE.toString())
  ui_alert(`TaskCentral update detected: ${localStorage.last_release} -> ${RELEASE_DATE}. Browser cache clear recommended.\n ${RELEASE_NOTES}`);

localStorage.last_release = RELEASE_DATE;
