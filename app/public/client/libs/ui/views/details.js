let _selected_task;
let _home_detail;
let _home_detail_form;

function _ui_home_detail_update_status_importance(task) {
  task = _selected_task || task;

  const now = timestamp();

  if (task.snoozed > now) {
    _home_detail_form.find('header > .snooze').hide();
    _home_detail_form.find('header > .unsnooze').html(`
      Unsnooze (${timeIntervalStringShort(task.snoozed, now, Infinity)} left)
      <i class="fa fa-bell"></i>
    `).show().attr('title', new Date(task.snoozed).toLocaleString());
  } else {
    _home_detail_form.find('header > .snooze').show();
    _home_detail_form.find('header > .unsnooze').hide();

    const snoozeDatepicker = document.getElementById('snooze-datetime');

    // default as the previous midnight (so when user selects next midnight,
    // onchange can be triggered)
    const defVal = new Date(midnight());

    defVal.setMinutes(defVal.getMinutes() - defVal.getTimezoneOffset());
    defVal.setMilliseconds(null)
    defVal.setSeconds(null)

    snoozeDatepicker.onchange = null;
    snoozeDatepicker.value = defVal.toISOString().slice(0, -1);
    snoozeDatepicker.onchange = () => {
      const date = new Date(snoozeDatepicker.value);
      if (!_selected_task || !(date > now)) return;

      task_snooze(_selected_task, date);

      _ui_home_details_signal_changed();
    };
  }

  let steps = task.steps || 100;
  let _prog = Math.round((task.progress || 0) / 100 * steps);

  _home_detail_form.find('input[name=progress-value-indicator]')
    .val(`${_prog} / ${steps}`);

  _home_detail_form.find('input[name=progress]')
    .attr('max', steps)
    .val(_prog)[0].onchange = (e) => {
      if (!_selected_task) return;

      // 0 - something
      let max = parseInt(e.target.max || 100);

      let progress = parseInt(e.target.value) || null;

      progress = Math.round(progress / max * 100);

      task_update_progress(_selected_task, progress);
      _ui_home_details_signal_changed();
    };

  _home_detail_form.find('input[name=status]')
    .val(task.status + '; importance=' + task_calc_importance(task).toFixed(2));

  let log_ta = _home_detail_form.find('textarea[name=log]')
    .val(task_gen_readable_log(task));
  log_ta[0].readOnly = true;

  _home_detail_form.find('.edit-log-errors').html('');

  let cancelBtn = _home_detail_form.find('input[name="edit-log-cancel"]')
    .hide();
  cancelBtn[0].onclick = () => {
    _ui_home_detail_update_status_importance(task);
  };

  _home_detail_form.find('input[name="edit-log"]')
    .val("Edit & Recalc timelog")[0].onclick = function () {
    log_ta[0].readOnly = false;
    log_ta[0].value = JSON.stringify(
      task.log,
      (k, v) => (k == 'time' ? `$$$date('${new Date(v).toLocaleString()}')$$$` : v),
      2
    ).replace(/"\$\$\$|\$\$\$"/g, '')
     .replace(/^\[|\]$/gm, '')
     .replace(/^  /gm, '')
     .replace(/^  (\{\})/g, '$1');

    log_ta[0].scrollTop = log_ta[0].scrollHeight;

    $(this).val("Submit")[0].onclick = function () {
      try {
        function date(x) {
          return new Date(x).getTime();
        }
        let a = eval('[' + log_ta.val() + ']');
        let msg = task_validate_log(a);
        if (msg) {
          _home_detail_form.find('.edit-log-errors').text(msg);
          return;
        }

        task.log = a;
        _ui_home_detail_update_status_importance(task);
        _home_detail_form.find('input[name=recalc]')[0].click();
      } catch (e) {
        _home_detail_form.find('.edit-log-errors').text(e.stack);
      }
    };

    cancelBtn.show();
  };

  let totalString = timeIntervalString(task.total, 0);

  if (task.total && task.progress) {
    let eta = task_calc_eta(task);
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

  // resets every input
  _home_detail_form.find('input[type!=button]').val('');

  _home_detail_form.find('input[name=name]')
    .val(task.name)[0].onchange = (e) => {
      if (!_selected_task) return;

      let name = e.target.value.trim();

      _selected_task.name = name;
      _ui_home_details_signal_changed();
    };
  _home_detail_form.find('input[name=project]')
    .val(task.project);

  _home_detail_form.find('.change-step-size').hide()
    .find('input').val(task.steps || 100)[0].onchange = (e) => {
      if (!_selected_task) return false;

      let max = parseInt(e.target.value);
      if (!(max >= 1 && max <= 100)) return false;

      let progress = Math.round(Math.round(task.progress / (100 / max)) / max * 100);

      task.steps = max;

      // also saves task.steps
      task_update_progress(_selected_task, progress, `steps=${max}`);
      _ui_home_details_signal_changed();
    };

  _ui_home_detail_update_status_importance(task);

  let recalc_btn = _home_detail_form.find('input[name=recalc]')[0];
  recalc_btn.onclick = () => {
    let diff = task_recalc_total(task);
    recalc_btn.value = `Changed by ${timeIntervalStringShort(Math.abs(diff))}`;
    recalc_btn.onblur = () => {
      recalc_btn.value = 'Recalc';
    };
    _ui_home_detail_update_status_importance(task);
    if (diff)
      back.set_dirty();
  };

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

  _ui_home_create_add_new_proj_btn(projects, 'ui_home_details_project_callback(_home_proj_form);return false;');

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

function ui_detail_snooze_tomorrow() {
  task_snooze(_selected_task);
  // ui_detail_close();
  _ui_home_details_signal_changed();
}

function ui_detail_unsnooze() {
  task_unsnooze(_selected_task);
  _ui_home_details_signal_changed();
}
