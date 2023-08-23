const THEMES_KEYS = [ 'default', 'default-dark' ];

function _theme_sys_dark() {
  return !!window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
}

function _theme_get_pref() {
  let theme = localStorage.tc_theme || (localStorage.tc_theme = 'default');
  let use_sys = localStorage.tc_theme_use_sys == 'true';
  let use_66 = localStorage.tc_theme_use_66 == 'true';

  function _check_dark() {
    if (_theme_sys_dark())
      theme = localStorage.tc_theme = theme.replace('-dark', '') + '-dark';
    else
      theme = localStorage.tc_theme = theme.replace('-dark', '');
  }

  // follow browser dark mode
  if (use_sys) {
    _check_dark();
    // listen for browser dark mode changes
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
      _check_dark();
      theme_update();
    });
  }

  // follow 6am - 6pm schedule
  if (use_66) {
    const currentHour = new Date().getHours();
    // day time
    if (currentHour >= 6 && currentHour < 18)
      theme = localStorage.tc_theme = theme.replace('-dark', '');
    else
      theme = localStorage.tc_theme = theme.replace('-dark', '') + '-dark';
  }
 
  return {
    theme, use_sys, use_66
  }
}

function theme_update(theme) {
  // get theme from localStorage
  let prefs = _theme_get_pref();
  theme = theme || prefs.theme;

  // update body className
  document.body.classList.remove(...THEMES_KEYS);
  document.body.classList.add(theme);

  // updates form
  $('.settings select[name="app-theme"]').val(theme);
  document.getElementById('filter-checkbox-use_sys').checked = prefs.use_sys;
  document.getElementById('filter-checkbox-use_66').checked = prefs.use_66;
}

function _theme_settings_onchange(select) {
  switch (select.id) {
    case 'filter-checkbox-use_sys':
      localStorage.tc_theme_use_sys = select.checked ? 'true' : undefined;
      break;
    case 'filter-checkbox-use_66':
      localStorage.tc_theme_use_66 = select.checked ? 'true' : undefined;
      break;
    default:
      localStorage.tc_theme = select.value;
  }

  theme_update();
}

theme_update();
