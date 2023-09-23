const RELEASE_DATE = '20230923R1';

const RELEASE_NOTES = `
 Release notes:
1. Global rank recalibration
2. Added more ranks to accomodate high elo users.
3. Adjusted elo bell curve
4. All passwords migrated to bcrypt hashing. Admin will no longer be able to see user passwords.
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
