const RELEASE_DATE = '20231017';

const RELEASE_NOTES = `
 Release notes:
1. Changed bottom left corner time prediction algorithm. Previously, tasks without time tracked are ignored. Now, the work completed over time rate from tasks with time tracked information are extrapolated to include other tasks as well.
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
