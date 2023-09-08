const RELEASE_DATE = '20230908R1';

const RELEASE_NOTES = `
########## RELEASE NOTES ##########
1. Added feature to snooze until specified date
2. Fix overflow of details page header buttons for small screens
3. Tuned rank up animation

--------- PREVIOUS NOTES ----------
1. Added rank up animation
2. Fix today indicator bar having higher z-index than timer screen
3. Fix auto dark mode on 6a/6p setting doesn't work until refreshed
4. Fix bug where thread blocking confirm dialog causes server syncs to fail (ie. when deleting tasks).
5. Add Skill Groups in Metrics
`;

if (localStorage.last_release && localStorage.last_release != RELEASE_DATE.toString())
  ui_alert(`TaskCentral update detected: ${localStorage.last_release} -> ${RELEASE_DATE}. Browser cache clear recommended.\n ${RELEASE_NOTES}`);

localStorage.last_release = RELEASE_DATE;
