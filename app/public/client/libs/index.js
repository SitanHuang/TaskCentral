const RELEASE_DATE = '20240624';

const RELEASE_NOTES = `
 Release notes:
- Projects search bar in the Add Task pane now copies your current filter's project selection (ex. when user is in Work Mode filter, the list of projects selectable should only be work related)

 Older notes:
- Add search bar for selecting projects
- Added graphs for burndown statistics in task details pane.
- Reverts sorting mechanism in Ready, Default, All modesets to use task creation date as backup to the calculated importance value.
- Adds 2 icons for blocked tasks due to earliest date and/or dependencies. (If you don't want to see these, write custom spreadsheet rules in User Settings.)

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
