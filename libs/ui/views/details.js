let _selected_task;
let _home_detail;
let _home_detail_form;

function ui_detail_select_task(task) {
  ui_detail_close();

  _home_detail = _home_con.find('.task-detail').addClass('activated');
  _home_detail_form = _home_detail.find('form');

  _selected_task = task;

  _home_detail_form.find('input[name=name]')
    .val(task.name);

  history.pushState("details", null, null);
  window.onpopstate = function(event) {
    if (event) {
      ui_detail_close();
      window.onpopstate = null;
    }
  };
}

function ui_detail_close() {
  _selected_task = undefined;
  _home_con.find('.task-detail').removeClass('activated');
  _home_task_list.find('task.activated').removeClass('activated');
}