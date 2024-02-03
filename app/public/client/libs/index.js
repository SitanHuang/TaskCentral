const RELEASE_DATE = '20240203R1';

const RELEASE_NOTES = `
 Release notes:
1. Added "PomoTick" feature. Checkout the user settings for more.
2. Task list on the Home tab now displays the "until" date for tasks without a "due" date.
3. Task importance and sorting algorithm now considers "until" date.
4. Tooltip for "Until" date is rewritten for better guidance.
5. Gantt charts now correctly adjusts endpoints in regards to "until" dates.
6. Tasks with "until" date set but without "due" date are no longer considered for get-ahead metrics calculations (eg., calculating get-ahead for an exam preparation task does not make sense, and rankings shouldn't get penalized for clicking "complete" on the day of exam). Competitive Skill Groups will be updated correspondingly for the next calibration cycle.
7. Experimental auto data recovery during occasional data corruption, which disallowed users to log in again.

If you don't see changes, clear browser cache. If your data occasionally corrupts, contact admin (usually due to mysterious network issues that admin has failed to find a solution for).
`;

if (localStorage.last_release && localStorage.last_release != RELEASE_DATE.toString()) {
  // setTimeout(() => {
  //   if (back.data?.comp?.lastUpdated < 1694556340495) {
  //     back.data.comp.lastUpdated = undefined;
  //     back.data.comp.rank = undefined;
  //     back.set_dirty();
  //   }
  // }, 1000);
  ui_alert(`TaskCentral update detected: ${localStorage.last_release} -> ${RELEASE_DATE}. \n ${RELEASE_NOTES}`);
}

localStorage.last_release = RELEASE_DATE;
