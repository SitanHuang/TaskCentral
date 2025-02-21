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

  // progress bar is from 0-100 but we store it as 0.0 - 10.0 for legacy purposes
  ['weight', 'priority'].forEach(x => {
    const val = Math.round(task[x] * 10);

    _home_detail_form.find('input[name=' + x + ']')
      .val(val)[0].onchange = (e) => {
        if (!_selected_task) return;

        _selected_task[x] = parseInt(e.target.value) / 10;
        _ui_home_details_signal_changed();
      };
    _home_detail_form.find('.progress-num-input[name=' + x + '] .pure-button')
      .text(val)[0].onclick = async (_) => {
        if (!_selected_task) return;
        let input = await ui_prompt(
          `Change ${x} (0-100):`, val,
          { input: "number", min: 0, max: 100, valMinMax: true }
        );

        if (input && input >= 0 && input <= 100) {
          _selected_task[x] = parseInt(input) / 10;
          _ui_home_details_signal_changed();
        }
      }
  });

  let steps = task.steps || 100;
  let _prog = task_get_prog_user_steps(task);

  _home_detail_form.find('input[name=progress-value-indicator]')
    .val(`${_prog} / ${steps}`);

  _home_detail_form.find('.progress-num-input[name="progress"] .pure-button')
    .text(`${_prog}`)[0].onclick = async (_) => {
      if (!_selected_task) return;
      let input = await ui_prompt(
        `Change progress (0-${steps}):`, _prog,
        { input: "number", min: 0, max: steps, valMinMax: true }
      );

      if (input && input >= 0 && input <= steps) {
        let progress = input || null;

        progress = Math.round(progress / steps * 100);

        task_update_progress(_selected_task, progress);
        _ui_home_details_signal_changed();
      }
    };

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

  _home_detail_form.find('input[type=date]').each(function () {
    let input = this;
    input.valueAsNumber = task[input.name] || NaN;

    // earliest date is managed by dependency
    if (input.name == "earliest" && task_has_dependsOn(task)) {
      input.disabled = true;
      input.title = "Earliest is managed by task dependency.";
      input.onchange = null;
    } else {
      input.disabled = false;
      input.onchange = () => {
        if (!_selected_task) return;
        _selected_task[input.name] = input.valueAsNumber ? task_parse_date_input(input.value).getTime() : null;
        _ui_home_details_signal_changed();
      };

      input.title = "";
    }
  });

  _ui_detail_render_dependsOn(task);

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
        // we can't just rely on recalc.onclick() to set it dirty,
        // sometimes changing timetsamp of progress doesn't trigger upload
        back.set_dirty();

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
    let etaStr = timeIntervalStringShort(eta);

    totalString += ` (about ${etaStr} left`;

    let daysLeft = ((task.due || task.until) - midnight()) / 8.64e+7;
    if (daysLeft > 0) {
      let perDay = eta / daysLeft;
      perDay = timeIntervalStringShort(perDay);

      totalString += `, ${perDay}/day until due`;
    }

    totalString += `)`;
  }

  _ui_detail_render_burndown_stats(task);

  _home_detail_form.find('input[name=total]')
    .val(totalString);

  let recurLimit = _home_detail_form.find('input[name="recur-limit"]');
  recurLimit[0].onchange = null;
  if (task.status == 'recur') {
    recurLimit.val(task.recurLim)[0].onchange = () => {
      if (_selected_task !== task) return;

      let val = parseFloat(recurLimit.val());

      if (val === task.recurLim) return;

      if (!Number.isInteger(val) || val > 1024 || val < 0) {
        ui_alert("Recurrence Limit must be between 1024 and 0.");
        recurLimit.val(task.recurLim);
        return;
      }

      task.recurLim = val;

      _ui_home_details_signal_changed();
    };

    _home_detail_form.find('textarea[name="recur-info"]')
      .val(task_recur_gen_readable_info(task));
  }
}

function _ui_detail_render_burndown_stats(task) {
  let { avgRatesData, progressData, timeData } = task_gen_burndown_stats(task);

  if (Math.min(avgRatesData.length, progressData.length, timeData.length) >= 2) {
    _home_detail_form.find('#task-burndown-chart')
      .css('min-height', 450)
      .parent().show();
  } else {
    Plotly.purge('task-burndown-chart');
    _home_detail_form.find('#task-burndown-chart').parent().hide();
    return;
  }

  avgRatesData.forEach(x => x.time = new Date(x.time));
  progressData.forEach(x => { x.time = new Date(x.time); x.progress = 100 - x.progress; });
  timeData.forEach(x => { x.time = new Date(x.time); x.total /= 3.6e+6; }); // to hour

  let traceProgress = {
    type: "scatter",
    mode: "lines+markers",
    name: '% Remaining',
    x: progressData.map(x => x.time),
    y: progressData.map(x => x.progress),
    line: { color: '#DB4437', size: 4, shape: 'linear' },
    marker: { size: 8 },
  };
  let traceRate = {
    type: "scatter",
    mode: "lines+markers",
    name: 'Avg. %/hr',
    x: avgRatesData.map(x => x.time),
    y: avgRatesData.map(x => x.rate),
    line: { color: '#2196F3', size: 1, shape: 'linear' },
    marker: { size: 8 },
    yaxis: 'y2',
  };
  let traceTime = {
    type: "scatter",
    mode: "lines+markers",
    name: 'Hours Spent',
    x: timeData.map(x => x.time),
    y: timeData.map(x => x.total),
    line: { color: '#4CAF50', size: 4, shape: 'linear' },
    marker: { size: 8 },
    yaxis: 'y3',
  };

  let data = [traceRate, traceProgress, traceTime];

  let layout = {
    title: 'Burndown Statistics',
    xaxis: {
      autorange: true,
      rangeselector: {
        buttons: [
          {
            count: 3,
            label: '3d',
            step: 'day',
            stepmode: 'backward'
          },
          {
            count: 7,
            label: '7d',
            step: 'day',
            stepmode: 'backward'
          },
          { step: 'all' }
        ]
      },
      // rangeslider: {},
      type: 'date'
    },
    yaxis: {
      // autorange: true,
      range: [0, 100],
      type: 'linear',
      tickfont: { color: '#DB4437' },
    },
    yaxis2: {
      autorange: true,
      type: 'linear',
      tickfont: { color: '#2196F3' },
      overlaying: 'y',
    },
    yaxis3: {
      autorange: true,
      type: 'linear',
      tickfont: { color: '#4CAF50' },
      side: 'right',
      overlaying: 'y',
    },
    showlegend: true,
    legend: { "orientation": "h" },
  };

  // remove series with only 1 unique y value
  data.forEach((x, i) => {
    if (new Set(x.y).size <= 1)
      x.visible = 'legendonly';
  });

  Plotly.react('task-burndown-chart', data, layout, { responsive: true });
}

function ui_detail_select_task(task) {
  ui_detail_close();

  _home_detail = _home_con.find('.task-detail').addClass('activated');
  _home_detail_form = _home_detail.find('form');

  if (task.status == 'recur') {
    _home_detail.addClass('recur');
  } else {
    _home_detail.removeClass('recur');
  }

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

  let hidden = _home_detail_form.find('input[name=hidden]')[0];
  hidden.checked = task.hidden;
  hidden.onchange = () => {
    if (!_selected_task) return;
    _selected_task.hidden = hidden.checked;
    _ui_home_details_signal_changed();
  };

  let pinned = _home_detail_form.find('input[name=pinned]')[0];
  pinned.checked = !!task.pinned;
  pinned.onchange = () => {
    if (!_selected_task) return;
    _selected_task.pinned = pinned.checked;
    _ui_home_details_signal_changed();
  };

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
    .sort(_project_user_sort_func())
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
  if (_selected_task) {
    task_run_ontouch_hook(_selected_task);
    task_update_dependents(_selected_task);
  }

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

async function ui_detail_delete() {
  if (await ui_confirm('Delete task "' + _selected_task.name + '"?')) {
    task_delete(_selected_task);
    ui_detail_close();
    ui_menu_select_home();
  }
}

function ui_detail_unsnooze() {
  task_unsnooze(_selected_task);
  _ui_home_details_signal_changed();
}

function _ui_detail_render_dependsOn(task) {
  function populateList(con, keys, isTaskChild) {
    con.html('').parent().hide();

    Object.keys(keys || {})
      .map(x => back.data.tasks[x])
      .sort((a, b) => {
        return (task_calc_importance(b) - task_calc_importance(a)) ||
          (task_completed_stamp(b) - task_completed_stamp(a))
      })
      .forEach(parent => {
        con.parent().show();

        let $row = $(document.createElement('task'));
        $row.attr('data-uuid', parent.id);
        $row.html(`
        <primary>
          <i class="fa fa-unlink"></i>
          <name></name>
          <div class="project"></div>
        </primary>
      `);

        _ui_home_task_row_decorate_class($row, parent);

        $row.find('name').text(parent.name);

        if (parent.project)
          project_create_chip(parent.project).appendTo($row.find('.project'));

        $row.click(() => {
          ui_detail_select_task(parent);
        });

        $row.attr('oncontextmenu', 'return false');
        $row.find('i.fa-unlink')
          .click(function (e) {
            e.preventDefault();

            if (isTaskChild)
              task_set_dependency(task, parent, false);
            else
              task_set_dependency(parent, task, false);

            _ui_home_details_signal_changed();
          });

        con.append($row);
      });
  }

  populateList(_home_detail_form.find(".dependsOn-list"), task.dependsOn, true);
  populateList(_home_detail_form.find(".dependedBy-list"), task.dependedBy, false);
}

function ui_detail_dependsOn_select(task) {
  if (!task.id || !task.name || !_selected_task)
    return;

  document.getElementById("dependsOnAutoComplete").value = "";
  _details_dep_autocomplete_engine.close();

  task_set_dependency(_selected_task, task);

  _ui_home_details_signal_changed();
}

let _details_mtime;
let _details_dep_autocomplete_cache;
let _details_dep_autocomplete_engine;

// run on boot
function _ui_details_dep_prepare_autocomplete() {
  const config = {
    name: "autoComplete",
    selector: '#dependsOnAutoComplete',
    searchEngine: "loose",
    placeHolder: "Search by Task Name...",
      data: {
        src: async () => {
          // cache list of all tasks based on mtime
          if (_details_mtime != (_details_mtime = back.mtime) || !_details_dep_autocomplete_cache)
            _details_dep_autocomplete_cache = Object.values(back.data.tasks).map(x => ({
              task: x,
              name: x.name + (x.project ? ` - ${x.project}` : "")
            }));

          return _details_dep_autocomplete_cache;
        },
      keys: ["name"],
      filter: list => {
        const q = document.getElementById("dependsOnAutoComplete").value.toLowerCase()
        return list.filter(x => {
          // cannot be self
          if (x.value.task.id == _selected_task.id)
            return false;

          // cannot depend on child
          if ((_selected_task.dependedBy || {})[x.value.task.id])
            return false;

          // cannot already depend on task
          if ((_selected_task.dependsOn || {})[x.value.task.id])
            return false;

          return true;
        }).sort((a, b) => {
          const t1 = a.value.task;
          const t2 = b.value.task;

          let fs = diceCoefficient(q, t1.name.toLowerCase());
          let ss = diceCoefficient(q, t2.name.toLowerCase());

          if (t1.status == 'completed')
            fs -= 0.5;
          if (t2.status == 'completed')
            ss -= 0.5;

          let diff = ss - fs;

          return diff ? diff : t1.name > t2.name;
        });
      }
    },
    resultItem: {
      highlight: true,
      element: (item, data) => {
        const task = data.value.task;

        item.setAttribute("data-uuid", task.id);

        if (task.status == 'completed') {
          item.setAttribute("class", "completed");
        }

        project_color_element($(item), task.project);
      },
    },
    resultsList: {
      element: (list, data) => {
        if (!data.results.length) {
          const message = document.createElement("div");
          message.setAttribute("class", "no-result");
          message.innerHTML = `<span>No Results for "${data.query}"</span>`;

          list.prepend(message);
        }
      },
      noResults: true,
      maxResults: 50,
      threshold: 1,
    },
  };

  _details_dep_autocomplete_engine = new autoComplete(config);
  _details_dep_autocomplete_engine.init();

  document.querySelector("#dependsOnAutoComplete").addEventListener("selection", function (event) {
    ui_detail_dependsOn_select(event.detail.selection.value.task);
  });
}

_ui_details_dep_prepare_autocomplete();
