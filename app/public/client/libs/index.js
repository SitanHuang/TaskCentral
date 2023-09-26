const RELEASE_DATE = '20230926';

const RELEASE_NOTES = `
 Release notes:
1. Depreciation of task importance due to progress change is no longer linear; depreciation now accelerates in the beginning but reverses direction towards near-completion. It uses a hybrid heuristic that combines exponential decay and hyperbolic functions to strike a balance between task urgency and concurrency.
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
