let _settings_con;

function ui_menu_settings_reset_primaryColor() {
  _settings_con = $('.content-container > div.settings');
  _settings_con.find('.user-form input[name="app-primary-color"]')
    .val(APP_DEFAULT_PRIMARY_COLOR).change();
}

function ui_menu_passwd() {
  _settings_con = $('.content-container > div.settings');
  const new_pswd = _settings_con.find('.user-form input[name="new-password"]').val();

  $.post(
      'user/passwd' + (back.su ? `?su=${back.su}` : ''),
      { new_pswd }
  ).fail(function () {
    ui_alert('Failed to reach remote server.');
  }).done(function (msg) {
    if (msg == 'ok') {
      ui_alert('Password updated successfully. You will be logged out shortly.').finally(() => {
        location.reload();
      });
    } else {
      ui_alert(`Failed to change password: ${msg}`);
    }
  });
}

function ui_menu_select_settings() {
  _settings_con = $('.content-container > div.settings');

  zip.configure({
    // our downloaded library is a reduced version
    // tha doesn't include webworker feature
    useWebWorkers: false
  });

  let percUsed = Math.round(10000 * back.user.size / back.user.quota * 100) / 10000;

  let projectSort = _settings_con.find('select[name="app-projects-sort"]');
  let color = _settings_con.find('.user-form input[name="app-primary-color"]');
  let pro = _settings_con.find('#app-pro-mode');
  let confirmDelete = _settings_con.find('#app-confirm-delete');
  let pomotick = _settings_con.find('#app-pomotick');
  let pomodoro = _settings_con.find('.user-form input[name="app-pomodoro-time"]');
  let pomoautostart = _settings_con.find('#app-pomodoro-autostart');
  let pomodorobreak = _settings_con.find('.user-form input[name="app-pomodoro-break-time"]');
  let pomoautobreakstart = _settings_con.find('#app-pomodoro-autostart-break');

  Object.keys(_UI_USER_STYLE_THRESHOLDS).forEach(key => {
    let multiply = key.match("weight|priority");

    let input = _settings_con.find(`input[name="${key}"][type="number"]`);
    input[0].onchange = function () { };
    input.val(_ui_settings_get_user_style_threshold(key) * (multiply ? 10 : 1));
    input[0].onchange = function () {
      back.data.settings.styleThresholds = back.data.settings.styleThresholds || {};

      const def = _UI_USER_STYLE_THRESHOLDS[key];

      val = parseFloat(input.val());


      if (multiply)
        val /= 10;

      if (Number.isNaN(val))
        val = def.def;

      back.data.settings.styleThresholds[key] = Math.min(def.max, Math.max(val, def.min));

      if (back.data.settings.styleThresholds[key] == def.def)
        delete back.data.settings.styleThresholds[key];

      back.set_dirty();
    };
  });

  // unbind
  projectSort[0].onchange = function () { };
  // set value
  projectSort.val(project_get_user_sorting());
  // bind
  projectSort[0].onchange = function () {
    back.data.settings.projectSort = projectSort.val() || "time";
    back.set_dirty();
  };

  // unbind
  color[0].onchange = function () {};
  // set value
  color.val(back.data.settings.primaryColor || APP_DEFAULT_PRIMARY_COLOR);
  // bind
  color[0].onchange = function () {
    back.data.settings.primaryColor = color.val() || APP_DEFAULT_PRIMARY_COLOR;
    back.set_dirty();

    ui_update_primaryColor();
  };

  // unbind
  pro[0].onchange = function () {};
  // set value
  pro[0].checked = back.data.settings.proMode || false;
  // bind
  pro[0].onchange = function () {
    if (pro[0].checked)
      back.data.settings.proMode = true;
    else
      delete back.data.settings.proMode;
    back.set_dirty();

    ui_update_proMode();
  };

  // unbind
  confirmDelete[0].onchange = function () {};
  // set value
  confirmDelete[0].checked = back.data.settings.confirmDelete ?? true;
  // bind
  confirmDelete[0].onchange = function () {
    if (!confirmDelete[0].checked)
      back.data.settings.confirmDelete = false;
    else
      delete back.data.settings.confirmDelete;
    back.set_dirty();
  };

  // unbind
  pomotick[0].onchange = function () {};
  // set value
  pomotick[0].checked = back.data.settings.usePomoticks || false;
  // bind
  pomotick[0].onchange = function () {
    if (pomotick[0].checked)
      back.data.settings.usePomoticks = true;
    else
      delete back.data.settings.usePomoticks;
    back.set_dirty();
  };

  // unbind
  pomoautostart[0].onchange = function () {};
  // set value
  pomoautostart[0].checked = back.data.settings.autostartPomo || false;
  // bind
  pomoautostart[0].onchange = function () {
    if (pomoautostart[0].checked)
      back.data.settings.autostartPomo = true;
    else
      delete back.data.settings.autostartPomo;
    back.set_dirty();
  };

  // unbind
  pomoautobreakstart[0].onchange = function () { };
  // set value
  pomoautobreakstart[0].checked = back.data.settings.autostartPomobreak || false;
  // bind
  pomoautobreakstart[0].onchange = function () {
    if (pomoautobreakstart[0].checked)
      back.data.settings.autostartPomobreak = true;
    else
      delete back.data.settings.autostartPomobreak;
    back.set_dirty();
  };

  // unbind
  pomodoro[0].onchange = function () {};
  // set value
  pomodoro.val(back.data.settings.pomodoro || 25);
  // bind
  pomodoro[0].onchange = function () {
    const val = Math.min(Math.max(parseInt(pomodoro.val()), 5), 120) || 25;
    pomodoro[0].value = val;
    back.data.settings.pomodoro = val;
    back.set_dirty();
  };

  // unbind
  pomodorobreak[0].onchange = function () {};
  // set value
  pomodorobreak.val(back.data.settings.pomodoroBreakTime || 5);
  // bind
  pomodorobreak[0].onchange = function () {
    const val = Math.min(Math.max(parseInt(pomodorobreak.val()), 5), 120) || 5;
    pomodorobreak[0].value = val;
    back.data.settings.pomodoroBreakTime = val;
    back.set_dirty();
  };

  _settings_con.find('.user-form input[name="username"]').val(back.user.name);
  _settings_con.find('.user-form input[name="permission"]').val(back.user.status);
  _settings_con.find('.user-form progress[name="quota"]')
    .attr("max", back.user.quota)
    .attr("value", back.user.size)
    .text(`${percUsed}%`);
  _settings_con
    .find('.user-form span[name="quota"]')
    .text(`${back.user.size} / ${back.user.quota} bytes (${percUsed}% full)`);
}
function ui_menu_recalc_all() {
  const query = {
    queries: [{
      status: [],
      collect: ['tasks'],
      from: 0,
      to: new Date(2100, 1, 1).getTime()
    }]
  };

  const callback = () => {
    let tasks = query_exec(query)[0].tasks;

    let total = 0;
    let tdiff = 0;

    for (let task of tasks) {
      let diff = task_recalc_total(task);
      if (!diff) continue;

      console.log(task.name, diff);
      tdiff += diff;
      total++;
    }

    if (!tasks?.length) {
      alert("Tasks not found.");
      return;
    }

    if (!total) {
      alert("All tasks' totals match their logs.");
      return;
    }

    let s = confirm(`Update ${total} tasks that deviate from log by a total of ${timeIntervalStringShort(total)}?`);
    if (s) {
      back.set_dirty()
    } else {
      window.onbeforeunload = null;

      location.reload();
    }
  };

  ui_filter_open(query, callback);
}

function ui_menu_cleanup_periods() {
  const query = {
    queries: [{
      status: [],
      collect: ['tasks'],
      from: 0,
      to: new Date(2100, 1, 1).getTime()
    }]
  };

  const callback = () => {
    let p = parseFloat(prompt("Remove periods with seconds less than:", "10.0"));

    if (!p) return;

    let tasks = query_exec(query)[0].tasks;

    let total = 0;
    let num = 0;

    for (let task of tasks) {
      let start;
      let start_log;

      let remove = [];

      for (let log of task.log) {
        if (log.type == 'start') {
          start = log.time;
          start_log = log;
        } else if (log.type == 'default' && start) {
          let end = log.time;
          let duration = end - start;

          if (duration / 1000 < p) {
            task.total -= duration;
            total += duration;
            num++;
            remove.push(start_log, log);
          }

          start = start_log = null;
        }
      }

      task.log = task.log.filter(x => remove.indexOf(x) == -1);
    }

    let s = confirm(`Remove ${timeIntervalStringShort(total)} in ${num} intervals? (avg ${timeIntervalStringShort(total / num)}/interval)`);
    if (s) {
      back.set_dirty()
    } else {
      window.onbeforeunload = null;

      location.reload();
    }
  };

  ui_filter_open(query, callback);
}

async function ui_settings_export_ledg() {
  // - create a Data64URIWriter object to write the zipped data into a data URI
  // - create a ZipWriter object with the Data64URIWriter object as parameter
  let zipWriter = new zip.ZipWriter(new zip.Data64URIWriter("application/zip"));

  let queries = { queries: [] };

  let endDate = new Date(2100, 0, 1);

  for (let i = new Date(1970, 0, 1); i < endDate; ) {
    let from = i.getTime();
    i.setFullYear(i.getFullYear() + 1);

    queries.queries.push({
      from: from,
      to: i.getTime(),
      collect: ['tasks']
    });
  }

  let years = query_exec(queries);
  for (let tasks of years) {
    let year = new Date(tasks.from).getFullYear();
    let range = [tasks.from, tasks.to];

    let content = '';

    for (let task of tasks.tasks) {
      let periods = task_gen_working_periods(task, range);
      for (let period of periods) {
        let from = new Date(period.from);
        from = from.getFullYear().toString().padStart(2, '0') + '-' +
               (from.getMonth() + 1).toString().padStart(2, '0') + '-' +
               from.getDate().toString().padStart(2, '0') + ' ' +
               from.getHours().toString().padStart(2, '0') + ':' +
               from.getMinutes().toString().padStart(2, '0') + ':' +
               from.getSeconds().toString().padStart(2, '0');
        let to = new Date(period.to);
        to = to.getFullYear().toString().padStart(2, '0') + '-' +
               (to.getMonth() + 1).toString().padStart(2, '0') + '-' +
               to.getDate().toString().padStart(2, '0') + ' ' +
               to.getHours().toString().padStart(2, '0') + ':' +
               to.getMinutes().toString().padStart(2, '0') + ':' +
               to.getSeconds().toString().padStart(2, '0');
        let proj = (period.task.project || '').replace(/\s/g, '');
        content += `i ${from} Expense${proj ? '.' + proj : proj} ${period.task.name}\n`;
        content += `O ${to}\n\n`;
      }
    }

    if (!content)
      continue;

    let inputBlob = new Blob([content], { type: "text/plain" });
    // - create a BlobReader object to read the content of inputBlob
    // - add a new file in the zip and associate it to the BlobReader object
    await zipWriter.add(`export.${year}.ledg`, new zip.BlobReader(inputBlob));
  }

  // - close the ZipWriter object and get compressed data
  let dataURI = await zipWriter.close();
  console.log('dataURI', dataURI)
  let link = document.createElement('a');
  link.download = 'export.zip';
  link.href = dataURI;
  link.click();
}

const UI_SETTINGS_DEFAULT_STYLESHEET =`
/* Write custom CSS rules below: */

task.earliest .fa-check,
task.blocked .fa-check {
  display: none;
}

task.earliest {

}

task.earliest .fa-calendar-times {

}

task.blocked {

}

task.blocked .fa-lock {

}

.low-priority name {
  font-style: italic;
}
.low-weight name {
  font-weight: lighter;
}

.low-priority.low-weight.low-importance {
  opacity: 0.8;
}

.high-weight:not(.high-priority) name,
.high-weight.low-importance name {
  opacity: 0.9;
}
.high-weight name {
  font-weight: 600;
}

.high-importance {
  color: var(--theme-color-yellow);
}
.very-high-importance {
  color: var(--theme-color-red);
}

.very-high-importance.high-priority,
.very-high-importance.high-weight {
  font-weight: bolder;
}

.high-priority name {
  font-weight: bold;
}

.pinned {
  border-bottom: 1px solid var(--text-sec-color) !important;
}

.pinned:first-child {
  border-top: 1px solid var(--text-sec-color) !important;
}

/* Available classes: */

.low-weight {}
.high-weight {}

.low-priority {}
.high-priority {}

.low-importance {}
.high-importance {}
.very-high-importance {}

.high-priority.high-weight {}
.low-priority.low-weight {}

.high-priority.low-weight {}
.low-priority.high-weight {}
`;

// maps input names to attributes
const _UI_USER_STYLE_THRESHOLDS = {
  "low-priority-thre": {
    name: "lp",
    min: 0,
    max: 100,
    def: 3.3
  },
  "high-priority-thre": {
    name: "hp",
    min: 0,
    max: 100,
    def: 6.6
  },
  "low-weight-thre": {
    name: "lw",
    min: 0,
    max: 100,
    def: 3.3
  },
  "high-weight-thre": {
    name: "hw",
    min: 0,
    max: 100,
    def: 6.6
  },
  "low-importance-thre": {
    name: "li",
    min: 0,
    max: 100,
    def: 3.00
  },
  "high-importance-thre": {
    name: "hi",
    min: 0,
    max: 100000,
    def: 4.00
  },
  "very-high-importance-thre": {
    name: "vhi",
    min: 0,
    max: 100000,
    def: 5.00
  },
};

function _ui_settings_get_user_style_threshold(thresholdId) {
  const def = _UI_USER_STYLE_THRESHOLDS[thresholdId];
  const uThreds = back?.data?.settings?.styleThresholds || {};

  const val = uThreds[thresholdId];

  if (Number.isNaN(val) || !Number.isFinite(val))
    return def.def;

  return Math.min(def.max, Math.max(val, def.min));
}

function _ui_settings_get_user_stylesheets() {
  const css = back?.data?.settings?.stylesheet || UI_SETTINGS_DEFAULT_STYLESHEET;

  if (back?.data?.settings?.stylesheet == UI_SETTINGS_DEFAULT_STYLESHEET) {
    delete back.data.settings.stylesheet;
    back.set_dirty();
  }

  return css;
}

function ui_settings_apply_user_stylesheets() {
  const css = _ui_settings_get_user_stylesheets();

  document.getElementById('app-user-stylesheets').textContent = css;

  $('.settings textarea[name="user-stylesheet"]')
    .unbind('change')
    .val(css)
    .bind('change', function (e) {
      back.data.settings.stylesheet = e?.target?.value;

      if (back.data.settings.stylesheet?.trim() === "")
        back.data.settings.stylesheet = " "; // set to trusy

      back.set_dirty();

      ui_settings_apply_user_stylesheets();
    });
}

function ui_menu_settings_reset_stylesheet() {
  delete back.data.settings.stylesheet;
  delete back.data.settings.styleThresholds;
  back.set_dirty();

  ui_settings_apply_user_stylesheets();
  ui_menu_select_settings();
}