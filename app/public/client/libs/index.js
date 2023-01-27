const RELEASE_DATE = 20230128;

if (localStorage.last_release && localStorage.last_release != RELEASE_DATE.toString())
  alert(`TaskCentral update detected: ${localStorage.last_release} -> ${RELEASE_DATE}. Changes may apply. Browser cache clear recommended.`);

localStorage.last_release = RELEASE_DATE;
