const RELEASE_DATE = '20250329';

const RELEASE_NOTES = `
 Release notes:
- Added Project Priority Rules (Go to Add Task in home page -> cog icon next to "PROJECT")

If you don't see changes, clear browser cache or force refresh.
`;

if (localStorage.last_release && localStorage.last_release != RELEASE_DATE.toString()) {
  setTimeout(() => {
    if (back.data?.comp?.lastUpdated < 1694556340495) {
      back.data.comp.lastUpdated = undefined;
      back.data.comp.rank = undefined;
      back.set_dirty();
    }
  }, 1000);
  ui_alert(`TaskCentral update detected: ${localStorage.last_release} -> ${RELEASE_DATE}. \n ${RELEASE_NOTES}`);
}

localStorage.last_release = RELEASE_DATE;
