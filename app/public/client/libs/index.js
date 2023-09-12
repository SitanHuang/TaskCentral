const RELEASE_DATE = '20230912R1';

const RELEASE_NOTES = `
### RELEASE NOTES ###
1. Adjusted Skill Group algorithm.
2. Global Skill Group reset.

--- PREVIOUS NOTES ---
1. Added feature to snooze until specified date
2. Fix overflow of details page header buttons for small screens
3. Added rank up animation
4. Fix today indicator bar having higher z-index than timer screen
5. Fix auto dark mode on 6a/6p setting doesn't work until refreshed
6. Fix bug where thread blocking confirm dialog causes server syncs to fail (ie. when deleting tasks).
`;

if (localStorage.last_release && localStorage.last_release != RELEASE_DATE.toString()) {
  setTimeout(() => {
    if (back.data?.comp?.lastUpdated < 1694556340495) {
      back.data.comp.lastUpdated = undefined;
      back.data.comp.rank = undefined;
      back.set_dirty();
    }
  }, 1000);
  ui_alert(`TaskCentral update detected: ${localStorage.last_release} -> ${RELEASE_DATE}. Browser cache clear recommended.\n ${RELEASE_NOTES}`);
}

localStorage.last_release = RELEASE_DATE;
