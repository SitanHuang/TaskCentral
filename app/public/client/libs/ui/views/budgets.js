let _trackers_con;
let _trackers_list;
let _trackers_mtime;
let _trackers_queried_tasks;

function ui_menu_select_trackers() {
  _trackers_con = $('.content-container > div.trackers');
  _trackers_list = $('.content-container > div.trackers > .trackers-list');

  if (_trackers_mtime != (_trackers_mtime = back.mtime))
    _ui_trackers_rerender();
  else
    _ui_trackers_update_graphs(); // task list haven't changed but duration may change
}

function _ui_trackers_update_graphs() {
  const trackers = back.data?.trackers || [];

  for (let i = 0; i < trackers.length; i++) {
    _ui_trackers_gen_graphs(trackers[i], i);
  }
}

function _ui_trackers_rerender() {
  _ui_trackers_data_fetch();

  const trackers = back.data?.trackers || [];

  // set as tainted for removal
  _trackers_list.children('tracker').addClass('tainted');

  for (let i = 0;i < trackers.length;i++) {
    const tracker = trackers[i];

    // reuse existing element
    let ele = _trackers_list.children(`tracker[data-index="${i}"]`)
      .first().removeClass('tainted');

    // or create new
    if (!ele.length) {
      ele = _trackers_con.find('tracker.template').clone().appendTo(_trackers_list);

      _ui_trackers_add_tooltips(ele);
    }

    ele.attr('data-index', i.toString()).removeClass('template');

    ele.find('.fa-chevron-up')[0].onclick = () => {
      tracker_reorder(i, _ui_keydown_shift ? 0 : i - 1);
      _trackers_mtime = null;
      _ui_trackers_rerender();
    };
    ele.find('.fa-chevron-down')[0].onclick = () => {
      tracker_reorder(i, _ui_keydown_shift ? back.data.trackers.length - 1 : i + 1);
      _trackers_mtime = null;
      _ui_trackers_rerender();
    };
    ele.find('.fa-trash')[0].onclick = () => {
      tracker_delete(i);
      _trackers_mtime = null;
      _ui_trackers_rerender();
    };

    function __gen_onchange(ele, validate, callback) {
      ele[0].onkeyup = () => {
        try {
          if (validate(ele[0].value || '')) {
            ele[0].setCustomValidity("");
            return true;
          }
        } catch (_) { }

        ele[0].setCustomValidity("Invalid pattern.");
        return false;
      };

      ele[0].onchange = () => {
        if (!ele[0].onkeyup()) return false;

        callback(ele[0].value || '');

        _ui_trackers_signal_changed(tracker, i);
      };
    }

    const nameInput = ele.find('input[name="name"]');
    nameInput.val(tracker.name);
    const projectInput = ele.find('input[name="project"]');
    projectInput.val(tracker.projectRegex);
    const startInput = ele.find('input[name="from"]');
    startInput.val(tracker.start);
    const endInput = ele.find('input[name="to"]');
    endInput.val(tracker.end);
    const durInput = ele.find('input[name="duration"]');
    durInput.val(tracker.duration);
    const typeSelect = ele.find('select[name="type"]');
    typeSelect.val(tracker.type);

    __gen_onchange(
      nameInput,
      () => true,
      (val) => {
        tracker.name = val;
      }
    );
    __gen_onchange(
      projectInput,
      (val) => fzy_compile(val),
      (val) => {
        tracker.projectRegex = val;
      }
    );
    __gen_onchange(
      startInput,
      (val) => Sugar.Date.create(val) > 0,
      (val) => {
        tracker.start = val;
      }
    );
    __gen_onchange(
      endInput,
      (val) => Sugar.Date.create(val) > 0,
      (val) => {
        tracker.end = val;
      }
    );
    __gen_onchange(
      durInput,
      (val) => parse_smart_duration(val) > 0,
      (val) => {
        tracker.duration = val;
      }
    );
    __gen_onchange(
      typeSelect,
      () => true,
      (val) => {
        tracker.type = val;
      }
    );
  }

  // remove unused elements
  _trackers_list.children('tracker.tainted').remove();

  _ui_trackers_update_graphs();
}

function _ui_trackers_signal_changed(tracker, index) {
  back.set_dirty();

  _trackers_mtime = null;
  _ui_trackers_data_fetch();

  _ui_trackers_gen_graphs(tracker, index);
}

function _ui_trackers_add() {
  tracker_add(tracker_new());
  _trackers_mtime = null;

  _ui_trackers_rerender();
}

function _ui_trackers_gen_graphs(tracker, index) {
  const { from, to, tasks } = _trackers_queried_tasks[index];
  const periods = query_generate_log_periods(tasks, from, to);

  let now = to - from >= 86400000 - 1 ?
    Math.max(Math.min(midnight(tomorrow()) - 1, to), from) : // more than 1 day
    Math.max(Math.min(new Date(), to), from);

  const isLimit = tracker.type == 'limit';

  let budget = parse_smart_duration(tracker.duration);
  let total = 0;

  for (const p of periods) {
    total += p.to - p.from;
  }

  const percThrough = (now - from) / (to - from);

  // ========================== budget chart ==========================

  let workingUnit;

  // select appropriate time unit:
  for (let x of [
    { s: 's', l: 'Seconds', min: 0, val: 1000 },
    { s: 'min', l: 'Minutes', min: 60 * 1000, val: 60 * 1000 },
    { s: 'hr', l: 'Hours', min: 180 * 60 * 1000, val: 60 * 60 * 1000 },
  ]) {
    if (budget >= x.min) {
      workingUnit = x;
    }
  }

  budget /= workingUnit.val;
  total /= workingUnit.val;
  const remaining = budget - total;

  const shouldBe = percThrough * budget;

  Plotly.react(
    _trackers_list.find(`tracker[data-index="${index}"] .budget-chart`)[0],
    [
      {
        type: "indicator",
        mode: "number+gauge+delta",
        value: total,
        domain: { x: [0, 1], y: [0, 1] },
        delta: {
          reference: shouldBe, position: "top",
          increasing: { color: isLimit ? "red" : "green" },
          decreasing: { color: isLimit ? "green" : "red" },
        },
        title: {
          text:
            `<b>${isLimit ? "Limit" : "Goal"}</b>` +
            `<br><span style='font-size:0.9em'>${workingUnit.l}</span>`,
          font: { size: 18 }
        },
        gauge: {
          shape: "bullet",
          axis: { range: [0, Math.max(budget, total)] },
          threshold: {
            line: {
              color: isLimit ? "red" : "green",
              width: 2,
              gradient: { yanchor: "vertical" }
            },
            thickness: 1.5,
            value: shouldBe
          },
          bgcolor: "rgba(255, 255, 255, 0)",
          steps: [
            { range: [0, budget * 0.45], color: isLimit ? "green" : "red" },
            { range: [budget * 0.45, budget * 0.85], color: "yellow" },
            { range: [budget * 0.85, budget], color: isLimit ? "red" : "green" },
          ],
          bar: { color: "darkblue" }
        }
      }
    ],
    {
      height: Math.ceil(Math.min(280, 0.7 * window.innerWidth)),
      title: `${new Date(from).toLocaleDateString()} to ${new Date(to).toLocaleDateString()}`,
      margin: { l: 85, b: 80, r: 0, autoexpand: true }
    },
    { responsive: true }
  );

  // ========================== rate chart ==========================

  /*if (to - now <= 86400000 && now <= to)
    now = new Date();*/

  let periodTotal = to - from;
  let periodPassed = now - from;
  let periodRemaining = to - now;


  let periodUnit;

  for (let x of [
    { s: 'd', min: 0, val: 86400000 },
    { s: 'wk', min: 86400000 * 7, val: 86400000 * 7 },
    { s: 'mo', min: 86400000 * 30.4375, val: 86400000 * 30.4375 },
  ]) {
    if (Math.min(periodTotal / 6, periodRemaining) >= x.min) {
      periodUnit = x;
    }
  }

  periodTotal /= periodUnit.val;
  periodPassed /= periodUnit.val;
  periodRemaining /= periodUnit.val;

  const rateExpected = budget / periodTotal;
  const rateCurrent = total / periodPassed;
  const rateRequired = to - now > 1000 ?
    Math.max(remaining / periodRemaining, 0) : NaN;
  const eta = remaining / rateCurrent;

  const delta = rateCurrent - rateRequired;
  const deltaColor = delta > 0 ?
    (isLimit ? "red" : "green") : isLimit ? "green" : "red";

  Plotly.react(
    _trackers_list.find(`tracker[data-index="${index}"] .rate-chart`)[0],
    [
      {
        type: "indicator",
        mode: "gauge",
        value: rateCurrent,
        domain: { x: [0, 1], y: [0, 1] },
        title: {
          text: `<b>Current Rate</b><br>` +
            (to - now > 1000 ?
            `<span style='font-size: 0.8em;color: ${eta > periodRemaining ?
              (isLimit ? "green" : "red") : (isLimit ? "red" : "green")
            }'> ETA: ${eta.toFixed(1)} ${periodUnit.s}</span>` : ''),
        },
        gauge: {
          axis: { range: [0, Math.max(rateRequired * 1.1, rateCurrent * 1.25)] },
          threshold: {
            line: {
              color: "black",
              width: 2,
              gradient: { yanchor: "vertical" }
            },
            thickness: 1.5,
            value: rateExpected
          },
          bgcolor: "rgba(255, 255, 255, 0)",
          steps: [
            { range: [0, rateRequired * 0.45], color: isLimit ? "green" : "red" },
            { range: [rateRequired * 0.45, rateRequired], color: "yellow" },
            { range: [rateRequired, rateRequired * 10], color: isLimit ? "red" : "green" },
          ],
          bar: { color: "darkblue" }
        }
      }
    ],
    {
      height: Math.ceil(Math.min(245, 0.7 * window.innerWidth)),
      margin: { l: 20, b: 20, t: 115, r: 20, autoexpand: true },
      title: {
        text:
          `<br><span style="font-size: 1.5em;">` +
          `${rateCurrent.toFixed(2)}</span><br>` +
          `<span style="font-size: 0.9em;">` +
          `${workingUnit.s}/${periodUnit.s}</span><br>` +
            `<span style="color: ${deltaColor};font-size: 0.9em;">` +
          (delta ?
            `${delta > 0 ? '▲' : '▼'}${delta.toFixed(2)}` :
            (now > from && now <= to ? 'Last day' : '')) + '</span>',
        font: { size: 18 },
        yanchor: "bottom",
        yref: "paper",
        y: 0.55
      }
    },
    { responsive: true }
  );

  _trackers_list.find(`tracker[data-index="${index}"] svg.main-svg`)
    .css('background', 'rgba(0, 0, 0, 0)');
}

function _ui_trackers_data_fetch() {
  if (_trackers_mtime == (_trackers_mtime = back.mtime) && _trackers_queried_tasks?.length)
    return;

  _trackers_queried_tasks = tracker_exec_query();

  // placeholder for invalids, just in case we don't cause nullptr errors
  for (let result of _trackers_queried_tasks) {
    result.tasks = result.tasks || [];
  }
}

function _ui_trackers_add_tooltips(trackerEle) {
  trackerEle.find('label[name="project"]').attr('data-tooltip',
    'This is the same Glob Pattern used in Filters. ' +
    'Pattern matching recognizes the "." character as a delimiter of hierarchy. ' +
    'Use "\\v" prefix for Regex mode. For example:\n\n' +
    `Filtering "school.*" matches:\n` +
    `  a. school.lecture\n` +
    `  b. school.mse1500.hw\n` +
    `  c. school.mse1500.class project.meetings\n` +
    `  d. abc school 123.def\n` +
    `Filtering "school*" matches all of the above plus:\n` +
    `  a. school\n` +
    `  b. school 123\n` +
    `Filtering "..hw*" matches:\n` +
    `  a. school.mse1500.hw\n` +
    `  b. school.cs1100.hw.123\n` +
    `  c. work.hardware.123'`
  );
  trackerEle.find('label[name="from"], label[name="to"]').attr('data-tooltip',
    'Smart dates are dates that are dynamically evaluated relative to the ' +
    'current time. Valid examples include:\n' +
    '  - now\n' +
    '  - today\n' +
    '  - next week\n' +
    '  - last year\n' +
    '  - the 15th\n' +
    '  - next Tuesday\n' +
    '  - 3pm Wednesday\n' +
    '  - in 30 minutes\n' +
    '  - in half a year\n' +
    '  - five years ago\n' +
    '  - yesterday at 4pm\n' +
    '  - half an hour ago\n' +
    '  - an hour from now\n' +
    '  - 6:30pm in three days\n' +
    '  - the 4th of July\n' +
    '  - next week Thursday\n' +
    '  - the end of February\n' +
    '  - two weeks from today\n' +
    '  - the end of next week\n' +
    '  - next Saturday at 10am\n' +
    '  - the first day of 2013\n' +
    '  - four days after Monday\n' +
    '  - March 15th of last year\n' +
    '  - two days after tomorrow\n' +
    '  - the last day of February\n' +
    '  - Sunday, January 15th 2012\n' +
    '  - the beginning of this month\n' +
    '  - the 2nd Tuesday of November\n' +
    '  - 5-2002\n' +
    '  - 8/25/1978\n' +
    '  - 8-25-1978\n' +
    '  - 8.25.1978\n' +
    '  - 2012-12-31\n' +
    '  - 2016-Mar-18\n' +
    '  - 22 August\n' +
    '  - April 2012\n' +
    '  - June 3rd, 2005\n' +
    '  - 1 Dec. 2016\n' +
    '  - 17760523T024508+0830\n' +
    '  - 1997-07-16T19:20:30+01:00\n' +
    '  - 08-25-1978 11:42:32.488am\n' +
    '  - Wed, 03 Jul 2008 08:00:00 EST'
  );
  trackerEle.find('label[name="duration"]').attr('data-tooltip',
    `This function accepts pretty much any input formats that may be interpreted ` +
    `as duration, including ISO Durations (e.g. T10h40m), ISO timestamps ` +
    `(e.g. 2022-10-14 10:40), and both short and long hand representations ` +
    `(e.g.  "2 days 4hr 1m"). When using short or long hand representations, ` +
    `order doesn't matter and duplicate units are summed.`
  );

  ui_tooltips_init(trackerEle);
}
