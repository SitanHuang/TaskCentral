const RELEASE_DATE = '20240219';

const RELEASE_NOTES = `
 Release notes:
1. Allows custom style decoration rules to categorize different tasks. Checkout User Settings to individualize your TaskCentral!

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
