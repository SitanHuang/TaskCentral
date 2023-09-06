const RELEASE_DATE = '20230906R2';

const RELEASE_NOTES = `
########## RELEASE NOTES ##########
1. Added rank up animation
2. Fix today indicator bar having higher z-index than timer screen

--------- PREVIOUS NOTES ----------
1. Fix auto dark mode on 6a/6p setting doesn't work until refreshed
2. Fix bug where thread blocking confirm dialog causes server syncs to fail (ie. when deleting tasks).
3. Add Skill Groups in Metrics
`;

if (localStorage.last_release && localStorage.last_release != RELEASE_DATE.toString())
  ui_alert(`TaskCentral update detected: ${localStorage.last_release} -> ${RELEASE_DATE}. Browser cache clear recommended.\n ${RELEASE_NOTES}`);

localStorage.last_release = RELEASE_DATE;
