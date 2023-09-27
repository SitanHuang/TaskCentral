const RELEASE_DATE = '20230927R2';

const RELEASE_NOTES = `
 Release notes:
1. Fix "Ready" as default modeset not working for new users
2. Make home screen datepicker more intuitive.
3. Fixed performance bottleneck and increased server max concurrent users by 30 times.
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
