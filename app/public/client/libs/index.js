const RELEASE_DATE = '20240219R2';

const RELEASE_NOTES = `
 Release notes:
1. Allow tunable thresholds for task categorization in User Settings.
2. Allow custom style decoration rules to categorize different tasks. Checkout User Settings to individualize your TaskCentral!
3. Add task pinning.
4. Misc dark mode visibility fixes.

If you don't see changes, clear browser cache or force refresh.
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
