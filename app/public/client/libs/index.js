const RELEASE_DATE = '20231004R2';

const RELEASE_NOTES = `
 Release notes:
1. Global Skill Group recalibration
2. Improved Skill Group tooltip
3. Tuned Skill Group algorithm
4. Add tooltips
5. Add Pro Mode to user settings
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
