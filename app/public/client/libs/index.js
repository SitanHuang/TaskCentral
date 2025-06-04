const RELEASE_DATE = '20250604R1';

const RELEASE_NOTES = `
 Release notes:
- Import feature now allows setting task dependencies directly using Excel files (useful for batch generating Waterfall Method Work Packages).
- Add option in User Settings to allow task deletion without prompt (useful for batch deleting tasks on Home tab by right clicking on each and then click the delete buttons).

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
