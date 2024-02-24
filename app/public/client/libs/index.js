const RELEASE_DATE = '20240224';

const RELEASE_NOTES = `
 Release notes:
1. Right clicking (or long press on mobile) on tasks will reveal delete button.
2. Adds "Blocks" attribute to details panel for tasks with dependents.
3. Dependency changes are now saved to task logs.
4. Gantt items will now show dependency lines on mouse hover.
5. Gantt items now shows tooltips on mouse hover.

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
