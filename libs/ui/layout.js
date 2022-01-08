const $ui_sync_icon = $('i#sync-status');

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
}

function ui_menu_init() {
  $('.top-bar .pure-menu-link').click(function() {
    ui_menu_select(this.dataset.menu);
  });
  ui_menu_select('home');
}

function ui_menu_select(id) {
  $('.top-bar .pure-menu-item').removeClass('pure-menu-selected');
  $('.top-bar .pure-menu-link[data-menu="' + id + '"]')
    .parent().addClass('pure-menu-selected');
  $('.content-container > div').hide();
  $('.content-container > div.' + id).show();
  $('#status-bar').text('');
  eval('ui_menu_select_' + id + '()');
}