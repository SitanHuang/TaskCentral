const $ui_sync_icon = $('i#sync-status');
const $ui_sync_quota = $('#quota-status');

function ui_update_sync_status() {
  if (back.uploading) {
    $ui_sync_icon
      .removeClass('fa-check-circle')
      .addClass('fa-spin')
      .addClass('fa-circle-notch')
      .removeClass('fa-cloud-upload-alt');
  } else if (back.dirty) {
    $ui_sync_icon
      .removeClass('fa-check-circle')
      .removeClass('fa-spin')
      .removeClass('fa-circle-notch')
      .addClass('fa-cloud-upload-alt');
  } else {
    $ui_sync_icon
      .addClass('fa-check-circle')
      .removeClass('fa-spin')
      .removeClass('fa-circle-notch')
      .removeClass('fa-cloud-upload-alt');
  }

  $ui_sync_quota
    .text(
      `
        ${humanFileSize(back.user.size)} / ${humanFileSize(back.user.quota)}
        (${Math.round(back.user.size / back.user.quota * 100)}%)
      `
    );
}

const APP_DEFAULT_PRIMARY_COLOR = '#8F7034';

function ui_update_proMode() {
  $(document.body).toggleClass('proMode', back?.data?.settings?.proMode || false)
}

function ui_update_primaryColor() {
  document.querySelector(':root').style
    .setProperty(
      '--app-primary-color',
      back?.data?.settings?.primaryColor || APP_DEFAULT_PRIMARY_COLOR
    );
}

let _ui_keydown_shift = false;

/**
 * called after css.js readies backend & all other files
 */
function ui_menu_init() {
  ui_update_primaryColor();
  ui_update_proMode();

  $('.top-bar .pure-menu-link').click(function() {
    ui_menu_select(this.dataset.menu);
  });
  ui_menu_select('home');

  $(document).on('keyup keydown', function(e) {
    _ui_keydown_shift = e.shiftKey;
    return true;
  });
}

let _ui_menu_current_menu;

/*
 * some functions may change the style of status bar
 */
function ui_statusbar_reset() {
  $('#status-bar').text('').attr('style', '')
    .parent().attr('style', '');
}

function ui_menu_select(id) {
  _ui_menu_current_menu = id;
  $('.top-bar .pure-menu-item').removeClass('pure-menu-selected');
  $('.top-bar .pure-menu-link[data-menu="' + id + '"]')
    .parent().addClass('pure-menu-selected');
  $('.content-container > div').hide();
  $('.content-container > div.' + id).show();

  ui_statusbar_reset();

  eval('ui_menu_select_' + id + '()');
}
