const RELEASE_DATE = '20230916';

const RELEASE_NOTES = `
### RELEASE NOTES ###
1. Add user settings to change Pomodoro time interval
2. Add Pomodoro timer
`;

if (localStorage.last_release && localStorage.last_release != RELEASE_DATE.toString()) {
  // setTimeout(() => {
  //   if (back.data?.comp?.lastUpdated < 1694556340495) {
  //     back.data.comp.lastUpdated = undefined;
  //     back.data.comp.rank = undefined;
  //     back.set_dirty();
  //   }
  // }, 1000);
  ui_alert(`TaskCentral update detected: ${localStorage.last_release} -> ${RELEASE_DATE}. Browser cache clear recommended.\n ${RELEASE_NOTES}`);
}

localStorage.last_release = RELEASE_DATE;
