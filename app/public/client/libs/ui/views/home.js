let _home_addForm;
let _home_con;
let _home_button;
let _home_init;
let _home_proj_form;
let _home_project_search_input;

function ui_menu_select_home(_resetForm) {
  _home_con = $('.content-container > div.home');
  _home_addForm = $('#add-form');
  _home_addForm.find('input[name=name]').unbind('focus');
  ui_home_update_mode_btn();

  _home_project_search_input = _home_addForm.find('.projects .project-search-form input')[0];

  if (_resetForm) {
    _home_addForm[0].reset();
    _home_addForm.find('input').val('').change().blur(); // to trigger all listeners
    // ^ sliders should automatically go to center
    _home_addForm.find('.recur-intervals input[type="number"]').val("0");
    _home_addForm.find('#add-form-recur-limit').val("3");
    $('#add-form-recurrence')[0].checked = false;
  }

  // this binds the datepicker click listener
  ui_home_add_date_changed();

  if (_selected_task)
    ui_detail_select_task(_selected_task);
  else if (_home_detail)
    ui_detail_close();

  ui_home_update_list();

  let target_provider = () => HOME_QUERY;
  let callback_provider = () => ui_home_filter_callback;

  ui_filter_update_holders(target_provider, callback_provider);

  _home_addForm.find('input[name=name]').bind('focus', () => {
    ui_home_add_input_focus();
  });

  _home_project_search_input.onkeyup = () => { _home_project_search_input.onchange() };
  _home_project_search_input.onchange = () => {
    try {
      const search = fzy_compile(_home_project_search_input.value || '*');

      if (back.data._tele && _home_project_search_input.value.length) {
        back.data._tele._home_glob = new Date().getTime();
        back.data._tele._home_glob_s = _home_project_search_input.value;
        back.set_dirty();
      }

      _home_addForm.find('.projects project').each(function () {
        this.style.display = this.innerText.match(search) ? '' : 'none';
      });

      _home_project_search_input.setCustomValidity("");
    } catch (e) {
      _home_project_search_input.setCustomValidity("Invalid pattern.");
    }
  };

  if (_resetForm) {
    setTimeout(() => {
      _home_addForm.removeClass('focus-within');
    }, 2);
  }

  ['weight', 'priority'].forEach(x => {
    const input = _home_addForm.find('input[name=' + x + ']');
    const btn = _home_addForm.find('.progress-num-input[name=' + x + '] .pure-button');

    input[0].onchange = (_) => {
      btn.text(input.val());
    };

    btn.text(input.val())[0].onclick = async (_) => {
        let val = await ui_prompt(
          `Change ${x} (0-100):`, input.val(),
          { input: "number", min: 0, max: 100, valMinMax: true }
        );

        if (val && val >= 0 && val <= 100) {
          input.val(val);
          btn.text(input.val());
          ui_home_add_input_focus();
        }
      }
  });
}

// =========================================
//                Add task
// =========================================

function ui_home_focus_input() {
  _home_addForm.find('input[name=name]').focus();
}

function ui_home_add_input_focus() {
  // this helps to avoid window.click listener to remove focus-within
  // after the addClass
  setTimeout(() => {
    _ui_home_add_update_actions();
    _home_addForm.addClass('focus-within');
  }, 1);
}

let _ui_home_add_update_actions_keep_edit = false;

function _ui_home_add_update_actions() {
  let detailRow = _home_addForm.find('.detail-row');

  if (!_ui_home_add_update_actions_keep_edit)
    detailRow.removeClass('edit');
  _ui_home_add_update_actions_keep_edit = false

  let projects = _home_addForm.find('.detail-row .projects');
  projects.removeClass('show-hidden').children('project,a').remove();

  Object.keys(back.data.projects)
    .sort(_project_user_sort_func())
    .forEach(x => {
      let proj = back.data.projects[x];
      let chip = project_create_chip(x)
        .appendTo(projects)
        .click(() => {
          if (detailRow.hasClass('edit'))
            return;
          else
            _home_addForm.find('input[name=project]').val(x).change();
        });
      if (x != 'default') {
        chip
          .append(`<sep style="background: ${proj.fontColor}">&nbsp;</sep>`)
          .append($(`<i class="fa-solid fa-gear edit"></i>`).click(() => {
            _ui_home_project_raise_modal('ui_home_update_project_callback(_home_proj_form);', x);
          }))
          .append(`<sep style="background: ${proj.fontColor}">&nbsp;</sep>`)
          .append($(`<i class="fa-solid fa-trash del"></i>`).click(() => {
            ui_home_update_project_callback({
              oldname: x,
              name: '', // delete
              color: x.color
            });
          }));
      } else {
        chip.css('padding-right', '0.3em', 'important');
      }
    });

  // each time after we update the list, we filter again
  projects.find('.project-search-form input')[0].onchange();

  _ui_home_create_add_new_proj_btn(projects, 'ui_home_add_project_callback(_home_proj_form);');
}

function ui_home_add_project_edit() {
  _home_addForm.find('.detail-row').addClass('edit')
}
function ui_home_add_project_cancel_edit() {
  _home_addForm.find('.detail-row').removeClass('edit')
}

// reused in details panel
function _ui_home_create_add_new_proj_btn(projects, onsubmit, oldname) {
  $('<a class="pure-button flat-always"><i class="fa fa-plus"></i> NEW</a>')
    .click(() => {
      _ui_home_project_raise_modal(onsubmit, oldname);
    })
    .appendTo(projects)
    .css('padding-top', '0');
  $('<a class="pure-button flat-always"><i class="fa fa-eye"></i> SHOW HIDDEN</a>')
    .click(function () {
      if (this.textContent.match(/SHOW/))
        $(this).html(`<i class="fa fa-eye-slash"></i> HIDE HIDDEN`)
          .parent().addClass('show-hidden');
      else
        $(this).html(`<i class="fa fa-eye"></i> SHOW HIDDEN`)
          .parent().removeClass('show-hidden');
    })
    .appendTo(projects)
    .css('padding-top', '0');
}

function _ui_home_project_raise_modal(onsubmit, oldname) {
  let $modal = $('#modal-home-new-proj');
  $modal.removeClass(oldname ? 'new-proj' : 'update-proj');
  $modal.addClass(oldname ? 'update-proj' : 'new-proj');
  _home_proj_form = $modal.find('form')[0];
  $modal.find('*[data-micromodal-close]').attr('onclick', 'MicroModal.close("modal-home-new-proj")');
  $modal.find('form button[type=submit]').attr('onclick', onsubmit + ';return false');
  $modal.find('input').val('');
  $modal.find('input[name=color]').val(randomColor());

  let project = back.data.projects[oldname];
  if (project?.color)
    $modal.find('input[name=color]').val(project.color);

  $modal.find('input[name="hidden"]')[0].checked = !!project?.hidden;

  $modal.find('input[name="old-name"]').val(oldname || '');
  $modal.find('input[name="name"]').val(oldname || '');

  let $colors = $modal.find('.pure-g.colors-container');
  $colors.html('');

  for (let i = 0; i < 3 * 5; i++) {
    let c = randomColor();
    let div = $(`
        <div class="pure-u-1-5">
          <color style="background-color: ${c}"></color>
        </div>
        `)
    div.click(() => {
      $modal.find('input[name=color]').val(c);
    }).appendTo($colors);
  }

  history.pushState("modal-home-new-proj", null, null);
  window.onpopstate = function (event) {
    if (event) {
      MicroModal.close('modal-home-new-proj');
      window.onpopstate = null;
    }
  };
  MicroModal.show('modal-home-new-proj');
}

async function ui_home_update_project_callback(form) {
  let oldname, name, color;

  if (form instanceof HTMLElement || form instanceof jQuery) {
    form = $(form);
    oldname = form.find('input[name="old-name"]').val().trim();
    name = form.find('input[name=name]').val().trim();
    color = form.find('input[name=color]').val();
    hidden = form.find('input[name=hidden]')[0].checked;
  } else {
    oldname = form.oldname;
    name = form.name;
    color = form.color;
    hidden = form.hidden;
  }

  if (!name) name = null; // new name can be null
  if (!oldname?.length) return;

  try {
    if (oldname == 'default') {
      ui_alert("Can't modify project `default`.");
      return;
    }

    // if we're not deleting projects:
    if (name != null) {
      back.data.projects[name] = project_new({
        color: color,
        fontColor: fontColorFromHex(color),
        hidden: !!hidden,
        number: oldname != name ?
          0 : // if name change, task_set auto increments
          (back.data.projects[oldname]?.number || 0), // copy number over
      });
    }

    // if name change:
    if (oldname != name) {
      let tasks = query_exec({
        queries: [{ projects: [oldname], collect: ['tasks'], from: -Infinity, to: Infinity }]
      })[0].tasks;

      if (!await ui_confirm(`Batch modify ${tasks.length} tasks with ${oldname}?`))
        return;

      for (let task of tasks) {
        task.project = name;
        task_set(task);
      }

      delete back.data.projects[oldname];
    }

    back.set_dirty();

    if ($('#modal-home-new-proj').hasClass('is-open')) {
      MicroModal.close('modal-home-new-proj');
      window.onpopstate = null;
    }
  } finally {
    _ui_home_add_update_actions_keep_edit = true;

    if (_home_addForm.find('input[name=project]').val() == oldname)
      _home_addForm.find('input[name=project]').val(name).change();
    ui_home_update_list();

    ui_home_focus_input();
  }
}

function ui_home_add_project_callback(form) {
  form = $(form);
  const name = form.find('input[name=name]').val().trim();
  if (!name) return;

  const color = form.find('input[name=color]').val();

  back.data.projects[name] = project_new({
    color: color,
    fontColor: fontColorFromHex(color)
  });

  back.set_dirty();

  MicroModal.close('modal-home-new-proj');
  window.onpopstate = null;

  _home_addForm.find('input[name=project]').val(name).change();

  ui_home_focus_input();
}

function ui_home_add_project_changed(input) {
  input.value = input.value.trim();
  let proj = input.value;
  let $proj = _home_addForm.find('.input-row > .project').html('');
  if (!proj)
    return;

  project_create_chip(proj)
    .addClass('removable')
    .click(() => {
      input.value = '';
      ui_home_add_project_changed(input);
      ui_home_focus_input();
    })
    .appendTo($proj);

  ui_home_focus_input();
}

function ui_home_add_date_changed(input) {
  if (!input?.value) {
    _ui_home_add_remove_date();
  } else {
    _ui_home_add_show_date();
  }
}

function _ui_home_add_remove_date() {
  _home_addForm.find('.datepicker').show().unbind('click').bind('click', () => {
    _home_addForm.find('.datepicker > input[type="date"]')[0].showPicker();
  });
  _home_addForm.find('.date-due').hide();
}

function _ui_home_add_show_date() {
  const due = task_parse_date_input(_home_addForm.find('input[name=due]').val());


  _home_addForm.find('.datepicker').hide();
  _home_addForm.find('.date-due')
               .text(task_stringify_due(due))
               .attr('style', task_colorize_due(due))
               .show();
}

function ui_home_remove_due_date() {
  _home_addForm.find('input[name=due]').val('').change();
}

function ui_home_add_trigger() {
  let name = _home_addForm.find('.input-row input[name=name]').val().trim();
  if (!name) return;

  let earliest = document.getElementById('add-form-earliest');
  let until = document.getElementById('add-form-until');

  let task = task_new({
    name: name,
    project: _home_addForm.find('.input-row input[name=project]').val() || null,
    due: task_parse_date_input(_home_addForm.find('.input-row input[name=due]')
           .val()).getTime() || null,
    priority: parseInt(_home_addForm.find('.detail-row input[name=priority]').val()) / 10,
    weight: parseInt(_home_addForm.find('.detail-row input[name=weight]').val()) / 10,
    earliest: earliest.valueAsNumber ? task_parse_date_input(earliest.value).getTime() : null,
    until: until.valueAsNumber ? task_parse_date_input(until.value).getTime() : null,
  });

  let recur = $('#add-form-recurrence')[0].checked;

  // handle recurrence
  if (recur) {
    let intervals = [
      "#add-form-recur-months",
      "#add-form-recur-weeks",
      "#add-form-recur-days",
    ].map(x => parseFloat(_home_addForm.find(x).val()));

    // at least one has to be non-zero
    let fail = !(Math.max(...intervals) > 0);
    for (let int of intervals) {
      if (isNaN(int) || !isFinite(int) || int > 1024 || int < 0) {
        fail = true;
        break;
      }
    }

    if (fail) {
      ui_alert(
        "Recurrence months/weeks/days must be between 1024 and 0, " +
        "with at least one non-zero value."
      );
      return;
    }

    let limit = parseFloat(_home_addForm.find('#add-form-recur-limit').val());

    if (!Number.isInteger(limit) || limit > 1024 || limit < 0) {
      ui_alert("Recurrence Limit must be between 1024 and 0.");
      return;
    }

    task.recurInts = {
      month: intervals[0],
      week: intervals[1],
      day: intervals[2],
    };

    task.status = 'recur';

    task.recurLim = limit;
    task.recurIndex = 0;
  }

  task_set(task);

  _home_addForm.find('input').val('').change(); // to trigger all listeners
  _home_addForm.find('.recur-intervals input[type="number"]').val("0");
  _home_addForm.find('#add-form-recur-limit').val("3");
  $('#add-form-recurrence')[0].checked = false;

  ui_menu_select_home(true);

  if (recur)
    ui_detail_select_task(task);
}

function ui_home_mode_select() {
  history.pushState("modal-home-mode", null, null);
  window.onpopstate = function(event) {
    if (event) {
      MicroModal.close('modal-home-mode');
      window.onpopstate = null;
    }
  };
  MicroModal.show('modal-home-mode');
}

function ui_home_mode_select_trigger(mode, q, _resetInternal=false) {
  if (!_resetInternal) {
    window.onpopstate = null;
    MicroModal.close('modal-home-mode');

  }

  localStorage.home_mode = mode;
  localStorage.home_query = JSON.stringify(q);

  HOME_QUERY = JSON.parse(JSON.stringify(q)); // clone
  HOME_MODE = mode;
  ui_menu_select_home();
}

// =========================================
//                Listing
// =========================================

HOME_MODE = localStorage?.home_mode || 'ready';

const HOME_DEFAULT_QUERY = {
  queries: [{
    status: ['start', 'default'],
    hidden: false,
    collect: ['tasks'],
    from: 0,
    to: new Date(2100, 1, 1).getTime()
  }]
};
const HOME_READY_QUERY = {
  queries: [{
    status: ['ready', 'start', 'default'],
    hidden: false,
    collect: ['tasks'],
    from: 0,
    to: new Date(2100, 1, 1).getTime()
  }]
};
const HOME_ACTIONABLE_QUERY = {
  queries: [{
    status: ['ready', 'start', 'default', 'weight'],
    hidden: false,
    collect: ['tasks'],
    from: 0,
    to: new Date(2100, 1, 1).getTime()
  }]
};
const HOME_SNOOZED_QUERY = {
  queries: [{
    status: ['snoozed'],
    collect: ['tasks'],
    from: 0,
    to: new Date(2100, 1, 1).getTime()
  }]
};
const HOME_RECUR_QUERY = {
  queries: [{
    status: ['recur'],
    collect: ['tasks'],
    from: 0,
    to: new Date(2100, 1, 1).getTime()
  }]
};
const HOME_ALL_QUERY = {
  queries: [{
    status: [],
    collect: ['tasks'],
    from: 0,
    to: new Date(2100, 1, 1).getTime()
  }]
};
const HOME_COMPLETED_QUERY = {
  queries: [{
    status: ['completed'],
    collect: ['tasks'],
    from: 0,
    to: new Date(2100, 1, 1).getTime()
  }]
};
const HOME_HIDDEN_QUERY = {
  queries: [{
    // just like default, hidden hides completed tasks
    status: ['start', 'default'],
    hidden: true,
    collect: ['tasks'],
    from: 0,
    to: new Date(2100, 1, 1).getTime()
  }]
};

HOME_QUERY = JSON.parse(localStorage?.home_query || JSON.stringify(HOME_READY_QUERY));

let _home_task_list;

function ui_home_filter_callback() {
  HOME_QUERY.__custom = true;

  localStorage.home_query = JSON.stringify(HOME_QUERY);

  ui_home_update_mode_btn();
  ui_home_update_list();
}

function ui_home_update_mode_btn() {
  _home_button = $('#home-mode-button').text(
    (HOME_QUERY.__custom ? 'custom: ' : '') +
    HOME_MODE
  );
}

function ui_home_update_list() {
  _home_task_list = _home_con.find('.task-container > .task-list').html('');

  // this is convenient for ex. when user is in a work filter, projects should
  // only show work stuff
  _home_project_search_input.value = HOME_QUERY.queries[0]?.projectRegex || '';
  if (_home_project_search_input.onchange)
    _home_project_search_input.onchange();

  eval('_ui_home_' + HOME_MODE +'_list')();
}

function _ui_home_task_row_decorate_class($row, task) {
  if (task.weight >= _ui_settings_get_user_style_threshold("high-weight-thre"))
    $row.addClass("high-weight");
  else if (task.weight <= _ui_settings_get_user_style_threshold("low-weight-thre"))
    $row.addClass("low-weight");

  const priority = task_calc_proj_aware_priority(task);

  if (priority >= _ui_settings_get_user_style_threshold("high-priority-thre"))
    $row.addClass("high-priority");
  else if (priority <= _ui_settings_get_user_style_threshold("low-priority-thre"))
    $row.addClass("low-priority");

  // we're disabling offset so that pinned tasks with low importance previously
  // won't be affected
  const importance = task_calc_importance(task, "disable_offset");

  if (importance >= _ui_settings_get_user_style_threshold("very-high-importance-thre"))
    $row.addClass("very-high-importance");
  else if (importance >= _ui_settings_get_user_style_threshold("high-importance-thre"))
    $row.addClass("high-importance");
  else if (importance <= _ui_settings_get_user_style_threshold("low-importance-thre"))
    $row.addClass("low-importance");

  if (task.pinned)
    $row.addClass("pinned");

  if (!task.hidden)
    $row.find('.fa-eye-slash').remove();
  if (task.status != 'recur')
    $row.find('.fa-redo-alt').remove();

  if (task.earliest && timestamp() < task.earliest) {
    $row.addClass('earliest');

    if (task_dependency_is_blocked(task))
      $row.addClass('blocked')
        .find('.fa-lock')
        .attr('title', `This task is blocked by other tasks.`);
    else
      $row.find('.fa-lock')
        .attr('title', `This task cannot yet be started due to its Earliest attribute.`)
        .removeClass('fa-lock')
        .addClass('fa-calendar-times');
  } else {
    $row.find('.fa-lock').remove();
  }

  if (task.due || task.until) {
    $row.find('.date-due')
      .text(task_stringify_due(task.due || task.until))
      .attr('style', task_colorize_due(task.due || task.until))
      .show();
  }

  if (task.status != 'default')
    $row.find('i.fa-play, i.fa-check').hide();

  if (task.status == 'recur')
    $row.addClass('recur');

  if (task.status == 'completed') {
    $row.addClass('completed');
  } else {
    let progress = task.progress;
    $row.css(
      'background-image',
      progress ?
        `linear-gradient(90deg, var(--task-progress-done-bg) ${progress}%,
                                var(--task-progress-sep-bg) ${progress}%,
                                var(--task-progress-sep-bg) calc(${progress}% + 1px),
                                var(--task-progress-bg) calc(${progress}% + 1px),
                                var(--task-progress-bg) 100%)` :
        'none'
    );
  }
  if (task == _selected_task)
    $row.addClass('activated');
}

function _ui_home_gen_task_row(task) {
  let $row = $(document.createElement('task'));
  $row.attr('data-uuid', task.id);
  $row.html(`
    <primary>
      <i title="Delete task permanently." class="fa fa-trash"></i>
      <i title="Reopen task." class="fa fa-check-square"></i>
      <i title="Start the task." class="fa fa-play"></i>
      <i title="Mark as complete." class="fa fa-check"></i>
      <i title="The task is hidden." class="fa fa-eye-slash" style="opacity: 0.5"></i>
      <i title="The task is a recurring task template." class="fa fa-redo-alt" style="opacity: 0.5"></i>
      <i title="The task is blocked." class="fa fa-lock" style="opacity: 0.5"></i>
      <name></name>
      <div class="project"></div>
      <div class="date-due" style="display: none;"></div>
    </primary>
  `);

  _ui_home_task_row_decorate_class($row, task);

  // if buttons/project is clicked, don't propagate
  // to activate details
  $row.find('primary > *:is(i, .project)').click((e) => {
    e.stopPropagation();
  });

  $row.click(() => {
    _home_task_list.find('task.activated').removeClass('activated');
    ui_detail_select_task(task);
    $row.addClass('activated');
  });

  $row.find('i.fa-check-square')
    .click(() => {
      task_reopen(task);
      ui_menu_select_home();
    });
  $row.find('i.fa-trash')
    .click(async () => {
      ui_detail_delete(task);
    });
  $row.find('i.fa-play')
    .click(() => {
      if (back.data.started) {
        alert('Another task is already in progress!');
        return false;
      }
      task_start(task);
      timer_start_task(task);
    });
  $row.find('i.fa-check')
    .click(() => {
      task_complete(task);
      $row.addClass('completed');
      if (_selected_task)
        ui_detail_select_task(task);

      // if task has dependencies, we don't want user to not immediately see the
      // new task popping up, even if it means user can't immediately click
      // Delete on the old task
      if (task_has_dependedBy(task))
        ui_menu_select_home();
    });

  $row.on('contextmenu', () => {
    $row.toggleClass("context-menu");
    return false;
  });
  $row.find('i')
    .bind('mousedown touchstart click', () => {
      $row.addClass('child-clicked');
    })
    .bind('mouseup mouseleave touchend', () => {
      $row.removeClass('child-clicked');
    });
  $row.bind('blur mouseleave', () => {
    $row.removeClass('context-menu');
  })

  if (task.project)
    project_create_chip(task.project)
      .click(() => {
        HOME_QUERY.queries[0].projects = [task.project];
        ui_menu_select_home();
      })
      .appendTo($row.find('.project'));

  $row.find('name').text(task.name);

  return $row;
}

function _ui_home_normal_list_gen(tasks) {
  if (!tasks.length) {
    _home_task_list.html(`<p class="no-tasks">You're all done!</p>`);
  } else {
    for (let task of tasks) {
      _ui_home_gen_task_row(task).appendTo(_home_task_list);
    }
  }
}

function _ui_home_normal_status(tasks) {
  let due = tasks.filter(x => x.status != 'completed' && x.due);

  let weight_total = 0;
  let weight_completed = 0;

  let weight_due_eod = 0;

  let total = 0;

  let total_eta = 0;

  let perDayTot = 0;

  let now = timestamp();
  let ready = 0;

  tasks.forEach(x => {
    if (x.status != 'completed' && x.status != 'recur' && x.weight) {
      weight_total += x.weight;
      weight_completed += x.weight * x.progress / 100;

      let daysLeft = Math.max(((x.due || x.until) - midnight()) / 8.64e+7, 1);

      if (x.due || x.until) {
        let weightLeft = x.weight * (100 - x.progress) / 100;

        if (daysLeft > 0)
          weight_due_eod += weightLeft / daysLeft;
        else
          weight_due_eod += weightLeft;
      }

      total += x.total;

      let eta = task_calc_eta(x);
      if (eta > 0) {
        total_eta += eta;

        if (x.due || x.until)
          perDayTot += eta / daysLeft;
      }

      if (!x.earliest || now >= x.earliest)
        ready++;
    }
  });

  const rate = task_calc_wt_rate(tasks);

  // this extrapolates any rate=weight/tracked time information to tasks that
  // haven't been tracked but has weights
  total_eta = [total_eta, task_calc_eta(tasks)].sort((a, b) => a - b);

  // add 15% to upper estimate
  total_eta[1] *= 1.15;

  let prediction;

  // combine two methods to form an estimate (if different by 10min)
  if (Math.abs(total_eta[0] - total_eta[1]) < 600000)
    prediction = timeIntervalStringShort(Math.max(...total_eta));
  else
    prediction = total_eta.map(x => timeIntervalStringShort(x)).join(" to ");

  let perc = weight_completed / weight_total * 100;

  let completed_text = perc ? `, ~${Math.round(perc)}% work done` : '';

  if (perc)
    $('#status-bar').parent().css(
      'background-image',
      `linear-gradient(90deg, rgba(0,0,0,0.1) ${perc}%,
                              rgba(0,0,0,0.1) ${perc}%,
                              rgba(0,0,0,0) ${perc}%,
                              rgba(0,0,0,0) 100%)`
    );

  // let ready = due.filter(x => !x.earliest || now >= x.earliest).length;
  // let total = tasks.reduce((s, x) => ({ total: s.total + x.total }), { total: 0 }).total;

  let time_eod_text = '';
  if (rate > 0 && weight_due_eod) {
    // two ways to do this too
    let timeEod = Math.max(weight_due_eod / rate, perDayTot);
    time_eod_text = `, ${timeIntervalStringShort(timeEod)} required today`;
  }

  let text = (HOME_MODE == 'ready' ?
    `R: ${ready}${completed_text} | ${timeIntervalStringShort(total)} recorded, +${prediction} predicted${time_eod_text}` :
    `A: ${tasks.length} D: ${due.length} R: ${ready} | ${timeIntervalStringShort(total)}`);

  $('#status-bar').text(text);
}

// --------------- default -----------------
function _ui_home_default_list() {
  let tasks = _ui_query_filter();

  // default: sort by importance algorithm
  tasks = tasks.sort((a, b) =>
    (task_calc_importance(b) - task_calc_importance(a)) ||
    (b.created - a.created)
  );

  _ui_home_normal_status(tasks);

  _ui_home_normal_list_gen(tasks);
}

// --------------- ready -----------------
function _ui_home_ready_list() {
  let tasks = _ui_query_filter();

  // ready: sort by importance algorithm & filter out tasks not ready
  tasks = tasks.sort((a, b) =>
    (task_calc_importance(b) - task_calc_importance(a)) ||
    (b.created - a.created)
  );
  //.filter(x => x.earliest ? now >= x.earliest : true);

  _ui_home_normal_status(tasks);

  _ui_home_normal_list_gen(tasks);
}
// --------------- actionable -----------------
function _ui_home_actionable_list() {
  let tasks = _ui_query_filter();

  // ready: sort by importance algorithm & filter out tasks not actionable
  tasks = tasks.sort((a, b) =>
    (task_calc_importance(b) - task_calc_importance(a)) ||
    (b.created - a.created)
  );
  //.filter(x => x.earliest ? now >= x.earliest : true);

  _ui_home_normal_status(tasks);

  _ui_home_normal_list_gen(tasks);
}
// --------------- snoozed -----------------
function _ui_home_snoozed_list() {
  let tasks = _ui_query_filter();

  tasks = tasks.sort((a, b) =>
    (task_calc_importance(b) - task_calc_importance(a)) ||
    (b.created - a.created)
  );

  _ui_home_normal_status(tasks);

  _ui_home_normal_list_gen(tasks);
}
// --------------- recur -----------------
function _ui_home_recur_list() {
  let tasks = _ui_query_filter();

  tasks = tasks.sort((a, b) =>
    b.created - a.created
  );

  _ui_home_normal_status(tasks);

  _ui_home_normal_list_gen(tasks);
}
// --------------- all -----------------
function _ui_home_all_list() {
  let tasks = _ui_query_filter();

  // all: sort by creation date
  tasks = tasks.sort((a, b) =>
    b.created - a.created
  );

  _ui_home_normal_status(tasks);

  _ui_home_normal_list_gen(tasks);
}
// --------------- completed -----------------
function _ui_home_completed_list() {
  let tasks = _ui_query_filter();

  // completed: sort by complete date
  tasks = tasks.sort((a, b) =>
    task_completed_stamp(b) - task_completed_stamp(a)
  );

  _ui_home_normal_status(tasks);

  _ui_home_normal_list_gen(tasks);
}
// --------------- hidden -----------------
function _ui_home_hidden_list() {
  let tasks = _ui_query_filter();

  // hidden: sort by importance algorithm
  tasks = tasks.sort((a, b) =>
    task_calc_importance(b) - task_calc_importance(a)
  );

  _ui_home_normal_status(tasks);

  _ui_home_normal_list_gen(tasks);
}

function _ui_query_filter() {
  return query_exec(HOME_QUERY)[0].tasks;
}


$(window).click(function() {
  if (!$('#modal-home-new-proj').hasClass('is-open'))
    _home_addForm?.removeClass('focus-within');
});

$('#modal-home-new-proj').click(function (event) {
  event.stopPropagation();
});

$('#add-form').click(function(event){
  event.stopPropagation();
});

MicroModal.init();
