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

  let color = _settings_con.find('.user-form input[name="app-primary-color"]');
  let pro = _settings_con.find('#app-pro-mode');
  let pomodoro = _settings_con.find('.user-form input[name="app-pomodoro-time"]');

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
