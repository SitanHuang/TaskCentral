let _home_addForm;
let _home_con;
let _home_button;
let _home_init;
let _home_proj_form;

function ui_menu_select_home(_resetForm) {
  _home_con = $('.content-container > div.home');
  _home_addForm = $('#add-form');
  _home_addForm.find('input[name=name]').unbind('focus');
  _home_button = $('#home-mode-button').text(HOME_MODE);

  if (_resetForm) {
    _home_addForm[0].reset();
    _home_addForm.find('input').val('').change().blur(); // to trigger all listeners
    // ^ sliders should automatically go to center
  }

  // this binds the datepicker click listener
  ui_home_add_date_changed();

  if (_selected_task)
    ui_detail_select_task(_selected_task);
  else if (_home_detail)
    ui_detail_close();

  ui_home_update_list();

  let target_provider = () => HOME_QUERY;
  let callback_provider = () => ui_home_update_list;

  ui_filter_update_holders(target_provider, callback_provider);

  _home_addForm.find('input[name=name]').bind('focus', () => {
    ui_home_add_input_focus();
  });

  if (_resetForm) {
    setTimeout(() => {
      _home_addForm.removeClass('focus-within');
    }, 2);
  }
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
  projects.html('').removeClass('show-hidden');

  Object.keys(back.data.projects)
    .sort((a, b) =>
      (!!back.data.projects[a].hidden - !!back.data.projects[b].hidden) || // hidden projects go last
      (back.data.projects[b].lastUsed - back.data.projects[a].lastUsed))
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
    .css('position', 'relative')
    .css('top', '-0.1em');
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
    .css('position', 'relative')
    .css('top', '-0.1em');
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

  let task = task_new({
    name: name,
    project: _home_addForm.find('.input-row input[name=project]').val() || null,
    due: task_parse_date_input(_home_addForm.find('.input-row input[name=due]')
           .val()).getTime() || null,
    priority: parseInt(_home_addForm.find('.detail-row input[name=priority]').val()),
    weight: parseInt(_home_addForm.find('.detail-row input[name=weight]').val()),
  });
  task_set(task);

  _home_addForm.find('input').val('').change(); // to trigger all listeners

  ui_menu_select_home(true);
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

    localStorage.home_mode = mode;
    localStorage.home_query = JSON.stringify(q);
  }

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

function ui_home_update_list() {
  _home_task_list = _home_con.find('.task-container > .task-list').html('');

  eval('_ui_home_' + HOME_MODE +'_list')();
}

function _ui_home_gen_task_row(task) {
  let $row = $(document.createElement('task'));
  $row.attr('data-uuid', task.id);
  $row.html(`
    <primary>
      <i class="fa fa-trash"></i>
      <i class="fa fa-check-square"></i>
      <i class="fa fa-play"></i>
      <i class="fa fa-check"></i>
      <name></name>
      <div class="project"></div>
      <div class="date-due" style="display: none;"></div>
    </primary>
  `);

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

  if (task.earliest && timestamp() < task.earliest)
    $row.addClass('earliest');

  if (task.due) {
    $row.find('.date-due')
          .text(task_stringify_due(task.due))
          .attr('style', task_colorize_due(task.due))
          .show();
  }

  if (task.status != 'default')
    $row.find('i.fa-play, i.fa-check').hide();
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


  $row.find('i.fa-check-square')
    .click(() => {
      task_reopen(task);
      ui_menu_select_home();
    });
  $row.find('i.fa-trash')
    .click(async () => {
      if (await ui_confirm('Delete task "' + task.name + '"?')) {
        task_delete(task);
        // TODO: update details panel
        ui_menu_select_home();
      }
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
    });

  $row.attr('oncontextmenu', 'return false');
  $row.find('i')
    .bind('mousedown touchstart click', () => {
      $row.addClass('child-clicked');
    })
    .bind('mouseup mouseleave touchend', () => {
      $row.removeClass('child-clicked');
    });

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

  let total = 0;
  let total_eta = 0;

  let now = timestamp();
  let ready = 0;

  tasks.forEach(x => {
    if (x.status != 'completed' && x.weight) {
      weight_total += x.weight;
      weight_completed += x.weight * x.progress / 100;

      total += x.total;

      let eta = task_calc_eta(x);
      if (eta > 0)
        total_eta += eta;

      if (!x.earliest || now >= x.earliest)
        ready++;
    }
  });

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

  let text = (HOME_MODE == 'ready' ?
    `R: ${ready}${completed_text} | ${timeIntervalStringShort(total)} recorded, +${timeIntervalStringShort(total_eta)} predicted` :
    `A: ${tasks.length} D: ${due.length} R: ${ready} | ${timeIntervalStringShort(total)}`);

  $('#status-bar').text(text);
}

// --------------- default -----------------
function _ui_home_default_list() {
  let tasks = _ui_query_filter();

  // default: sort by importance algorithm
  tasks = tasks.sort((a, b) =>
    task_calc_importance(b) - task_calc_importance(a)
  );

  _ui_home_normal_status(tasks);

  _ui_home_normal_list_gen(tasks);
}

// --------------- ready -----------------
function _ui_home_ready_list() {
  let tasks = _ui_query_filter();

  // ready: sort by importance algorithm & filter out tasks not ready
  tasks = tasks.sort((a, b) =>
    task_calc_importance(b) - task_calc_importance(a)
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
    task_calc_importance(b) - task_calc_importance(a)
  );
  //.filter(x => x.earliest ? now >= x.earliest : true);

  _ui_home_normal_status(tasks);

  _ui_home_normal_list_gen(tasks);
}
// --------------- snoozed -----------------
function _ui_home_snoozed_list() {
  let tasks = _ui_query_filter();

  // ready: sort by importance algorithm & filter out tasks not snoozed
  tasks = tasks.sort((a, b) =>
    task_calc_importance(b) - task_calc_importance(a)
  );
  //.filter(x => x.earliest ? now >= x.earliest : true);

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
