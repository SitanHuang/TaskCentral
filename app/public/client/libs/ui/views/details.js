let _selected_task;
let _home_detail;
let _home_detail_form;

function _ui_home_detail_update_status_importance(task) {
  task = _selected_task || task;

  _home_detail_form.find('input[name=status]')
    .val(task.status + '; importance=' + task_calc_importance(task).toFixed(2));

  _home_detail_form.find('textarea[name=log]')
    .val(task_gen_readable_log(task));

  let totalString = timeIntervalString(task.total, 0);

  if (task.total && task.weight && task.progress) {
    let eta = Math.ceil(task.total / (task.progress / 100) - task.total);
    eta = timeIntervalStringShort(eta);

    totalString += ` (about ${eta} left)`;
  }

  _home_detail_form.find('input[name=total]')
    .val(totalString);
}

function ui_detail_select_task(task) {
  ui_detail_close();

  _home_detail = _home_con.find('.task-detail').addClass('activated');
  _home_detail_form = _home_detail.find('form');

  _home_detail_form.find('input').val('');

  _home_detail_form.find('input[name=name]')
    .val(task.name)[0].onchange = (e) => {
      if (!_selected_task) return;

      let name = e.target.value.trim();

      _selected_task.name = name;
      _ui_home_details_signal_changed();
    };
  _home_detail_form.find('input[name=project]')
    .val(task.project);

  _ui_home_detail_update_status_importance(task);

  _home_detail_form.find('input[name=created]')
    .val(new Date(task.created).toLocaleString());

  _home_detail_form.find('.textarea[name=notes]')
    .text(task.notes || '')[0].onblur = (e) => {
      if (!_selected_task) return;

      let content = e.target.innerText.trim();

      if (content)
        _selected_task.notes = content;
      else
        delete _selected_task.notes;
      _ui_home_details_signal_changed();
    };

  ['weight', 'priority'].forEach(x => {
    _home_detail_form.find('input[name=' + x + ']')
      .val(task[x])[0].onchange = (e) => {
        if (!_selected_task) return;

        _selected_task[x] = parseInt(e.target.value);
        _ui_home_details_signal_changed();
      };
  });

  _home_detail_form.find('input[name=progress]')
    .val(task.progress || 0)[0].onchange = (e) => {
      if (!_selected_task) return;

      let progress = parseInt(e.target.value) || null;
      task_update_progress(_selected_task, progress);
      _ui_home_details_signal_changed();
    };

  let hidden = _home_detail_form.find('input[name=hidden]')[0];
  hidden.checked = task.hidden;
  hidden.onchange = () => {
    if (!_selected_task) return;
    _selected_task.hidden = hidden.checked;
    _ui_home_details_signal_changed();
  };

  _home_detail_form.find('input[type=date]').each(function () {
    let input = this;
    input.valueAsNumber = task[input.name] || NaN;
    input.onchange = () => {
      if (!_selected_task) return;
      _selected_task[input.name] = input.valueAsNumber ? task_parse_date_input(input.value).getTime() : null;
      _ui_home_details_signal_changed();
    };
  });

  _home_detail_form.find('input').change();

  {
    // scroll log to end
    let ta = _home_detail_form.find('textarea[name=log]')[0];
    ta.scrollTop = ta.scrollHeight;
  }

  // putting _selected_task at the end so
  // onchange handlers don't update the task
  _selected_task = task;

  history.pushState("details", null, null);
  window.onpopstate = function(event) {
    if (event) {
      ui_detail_close();
      window.onpopstate = null;
    }
  };
}

function ui_home_detail_project_changed(input) {
  input.value = input.value.trim();
  let proj = input.value || null;

  if (_selected_task) {
    _selected_task.project = proj;
    _ui_home_details_signal_changed();
  }

  let $proj = _home_detail_form.find('.project-container .project').html('');

  let projects = _home_detail_form.find('.project-container .projects');
  projects.html('');

  Object.keys(back.data.projects)
    .sort((a, b) => back.data.projects[b].lastUsed - back.data.projects[a].lastUsed)
    .forEach(x => {
      project_create_chip(x)
        .appendTo(projects)
        .click(() => {
          input.value = x;
          ui_home_detail_project_changed(input);
        });
    });

  _ui_home_create_add_new_proj_btn(projects, 'ui_home_details_project_callback(this);return false;');

  if (proj)
    project_create_chip(proj)
      .addClass('removable')
      .click(() => {
        input.value = '';
        ui_home_detail_project_changed(input);
      })
      .appendTo($proj);
}

function ui_home_details_project_callback(form) {
  form = $(form);
  const name = form.find('input[name=name]').val().trim();
  if (!name) return;

  const color = form.find('input[name=color]').val();

  back.data.projects[name] = project_new({
    color: color,
    fontColor: fontColorFromHex(color)
  });

  MicroModal.close('modal-home-new-proj');
  window.onpopstate = null;

  // onchange should set to dirty & update project list as well
  _home_detail_form.find('input[name=project]').val(name).change();
}

function _ui_home_details_signal_changed() {
  // shouldn't update whole thing?
  ui_home_update_list();
  back.set_dirty();
  _ui_home_detail_update_status_importance();
}

function ui_detail_close() {
  _selected_task = undefined;
  _home_con.find('.task-detail').removeClass('activated');
  _home_task_list.find('task.activated').removeClass('activated');
}
