const RELEASE_DATE = '20240212R1';

const RELEASE_NOTES = `
 Release notes:
1. Allows numerical inputs for priority & weight.
  - Changed range from 0-10 to 0-100 (still internally stored as 0.0-10.0, for those of you using the task_new/task_set API)
  - Changed Excel batch import template to accomodate the 0-100 range.
2. Added option in user settings to allow alphabetical sorting of projects.
3. Added a beautiful progress bar for the Pomodoro timer.

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
  // ui_alert(`TaskCentral update detected: ${localStorage.last_release} -> ${RELEASE_DATE}. \n ${RELEASE_NOTES}`);
}

localStorage.last_release = RELEASE_DATE;
