const RELEASE_DATE = '20230131R1';

const RELEASE_NOTES = `

########## RELEASE NOTES ##########
1. Internal changes (task_update_progress() now journals regarding step change)
`;

if (localStorage.last_release && localStorage.last_release != RELEASE_DATE.toString())
  alert(`TaskCentral update detected: ${localStorage.last_release} -> ${RELEASE_DATE}. Browser cache clear recommended.\n ${RELEASE_NOTES}`);

localStorage.last_release = RELEASE_DATE;
