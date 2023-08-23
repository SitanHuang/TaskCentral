const THEMES_KEYS = [ 'default', 'default-dark' ];

function _theme_get_pref() {
  return localStorage.tc_theme || (localStorage.tc_theme = 'default');
}

function theme_update(set_theme) {
  // get theme from localStorage
  set_theme = set_theme || _theme_get_pref();

  // update body className
  document.body.classList.remove(...THEMES_KEYS);
  document.body.classList.add(set_theme);

  // updates drop down menu
  $('.settings select[name="app-theme"]').val(set_theme);
}

function _theme_dropdown_onchange(select) {
  localStorage.tc_theme = select.value;

  theme_update();
}

theme_update();
