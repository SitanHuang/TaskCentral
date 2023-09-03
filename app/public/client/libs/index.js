const RELEASE_DATE = '20230903';

const RELEASE_NOTES = `

########## RELEASE NOTES ##########
1. Reworked rank decay algorithm

--------- PREVIOUS NOTES ----------
1. Fix Skill Group calibration
2. Add Skill Groups in Metrics
`;

if (localStorage.last_release && localStorage.last_release != RELEASE_DATE.toString())
  alert(`TaskCentral update detected: ${localStorage.last_release} -> ${RELEASE_DATE}. Browser cache clear recommended.\n ${RELEASE_NOTES}`);

localStorage.last_release = RELEASE_DATE;
