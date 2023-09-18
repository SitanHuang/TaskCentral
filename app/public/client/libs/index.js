const RELEASE_DATE = '20230918';

const RELEASE_NOTES = `
### RELEASE NOTES ###
1. Change default modeset to "Ready"
`;

if (localStorage.last_release && localStorage.last_release != RELEASE_DATE.toString()) {
  delete localStorage.home_mode;
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
