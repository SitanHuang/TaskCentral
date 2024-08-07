const RELEASE_DATE = '20240808';

const RELEASE_NOTES = `
 Release notes:
- Task importance (and ordering) now recursively considers blocked tasks downstream
- Home view applies last used filter at app launch

 Older notes from this summer:
- Add tooltip on hovering time blocks in Log
- Added Treemap for analyzing time logs under "Trackers" tab
- Added "Trackers" tab for time tracking/budgeting. Feel free to feature-test and send feedback/bug reports.
- Projects search bar in the Add Task pane now copies your current filter's project selection (ex. when user is in Work Mode filter, the list of projects selectable should only be work related)
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
