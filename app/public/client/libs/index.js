const RELEASE_DATE = 20230127;

if (localStorage.last_release && localStorage.last_release != RELEASE_DATE)
  alert(`TaskCentral update detected: ${localStorage.last_release} -> ${RELEASE_DATE}. Changes may apply. Browser cache clear recommended.`);

localStorage.last_release = RELEASE_DATE;
