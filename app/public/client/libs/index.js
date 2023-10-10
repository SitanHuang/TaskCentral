const RELEASE_DATE = '20231010';

const RELEASE_NOTES = `
 Release notes:
1. To improve server performance, the enter backend infrastructure was rewritten. I apologize the instability over the past few days. Things should go back to normal now. If you encounter issues/bugs, please report to sysadmin. Thank you.
2. Fix updating progress log timestamps doesn't trigger upload
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
