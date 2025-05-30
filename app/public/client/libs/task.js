STATUS = [
  'start', // started via task.log.push()
  'default', // any status that is not started, shouldn't mean anything UI wise
  'completed', // completed (not deleted/abandoned)
];

function task_new(override) {
  let stamp = timestamp();

  return Object.assign({
    id: uuidv4(),
    name: '',
    project: null,
    tags: {}, // TODO: stub
    created: stamp,
    hidden: false, // unlike complete, this one can hide everything
    pinned: false,
    due: null,
    earliest: null, // earliest time to begin working
    until: null, // latest time that the task is still relevant
    status: 'default', // default, start, completed, recur
    // [steps: 1-100],
    // [notes: string],
    // [dependsOn: uuids{}],
    // [dependedBy: uuids{}],
    priority: 5, // 0-10 inclusive, relative degree of importance
    weight: 0, // 0-10 inclusive, relative amount of work
    progress: null, // latest progress, updated via task.log.push(), null same as 0
    total: 0, // total difference in timestamp spent on working (start -> default)
    // TODO: stub
    // [subtasks: []], // 2/24/24 note: already implemented via dependencies
    // status change should pay attention to log
    // ex. if status!=default, can't start/pause task
    log: [
      { type: 'default', time: stamp } // always first
      // { type: 'start', time: timestamp },
      // { type: 'default', time: timestamp },
      // { type: 'progress', time: timestamp, progress: int 0-100 },
      // { type: '+requires', time: timestamp, uuid: uuid },
      // { type: '-requires', time: timestamp, uuid: uuid },
      // { type: '+blocks', time: timestamp, uuid: uuid },
      // { type: '-blocks', time: timestamp, uuid: uuid },
    ],
    // [recurInts: {
    //   month: intervals[0],
    //   week: intervals[1],
    //   day: intervals[2],
    // }],
    // [recurIndex: 1-1024],
    // [recurLim: 1-1024],
  }, override);
}

/**
 * @returns true if task depends on others
 */
function task_has_dependsOn(task) {
  return !!(task.dependsOn && Object.keys(task.dependsOn).length);
}
/**
 * @returns true if task is depended by others
 */
function task_has_dependedBy(task) {
  return !!(task.dependedBy && Object.keys(task.dependedBy).length);
}

/**
 * set `child` to depend on `parent` if toggle is true,
 * removes `child` from `parent` if otherwise
 */
function task_set_dependency(child, parent, toggle=true) {
  child.dependsOn = child.dependsOn || {};
  parent.dependedBy = parent.dependedBy || {};

  const now = timestamp();

  if (toggle) {
    if (!child.dependsOn[parent.id]) {
      child.log.push({
        type: '+requires',
        time: now,
        uuid: parent.id,
      });
    }
    if (!parent.dependedBy[child.id]) {
      parent.log.push({
        type: '+blocks',
        time: now,
        uuid: child.id,
      });
    }

    child.dependsOn[parent.id] = 1;
    parent.dependedBy[child.id] = 1;
  } else {
    if (child.dependsOn[parent.id]) {
      child.log.push({
        type: '-requires',
        time: now,
        uuid: parent.id,
      });
    }
    if (parent.dependedBy[child.id]) {
      parent.log.push({
        type: '-blocks',
        time: now,
        uuid: child.id,
      });
    }

    delete child.dependsOn[parent.id];
    delete parent.dependedBy[child.id];
  }

  task_dependency_recalc_earliest(child);

  if (!Object.keys(child.dependsOn).length) {
    delete child.dependsOn;

    child.earliest = null;
  }

  if (!Object.keys(parent.dependedBy).length)
    delete parent.dependedBy;

  back.set_dirty();
}

/**
 * sets the `earliest` date of a task based on its dependencies
 *
 * if task has no dependencies, earliest is not changed
 *
 * a blocked task always has the earliest date set to tomorrow
 *
 * returns task.earliest, always
 *
 * NOTE: Method also executed every time query is ran
 */
function task_dependency_recalc_earliest(task) {
  // no dependencies:
  if (!task_has_dependsOn(task))
    return task.earliest;

  // remove bad IDs
  for (const id in task.dependsOn) {
    if (!back.data.tasks[id]) {
      delete task.dependsOn[id];
      back.set_dirty();
    }
  }

  let blocked = false;
  let latest = 0;

  for (const id in task.dependsOn) {
    const parent = back.data.tasks[id];

    if (parent.status == 'completed') {
      latest = Math.max(latest, midnight(task_completed_stamp(parent)));
    } else {
      blocked = true;
      latest = Math.max(latest, tomorrow(task_gantt_endpoints(parent)[1]));
    }
  }

  if (blocked && task.earliest !== latest) {
    // at least one task has yet to be finished
    task.earliest = latest;
    back.set_dirty();
  } else if (!blocked) {
    // all parents are completed
    let earliest = Math.min(latest, midnight());

    if (task.earliest != earliest) {
      task.earliest = earliest;
      back.set_dirty();
    }
  }

  return task.earliest;
}

function task_dependency_is_blocked(task) {
  if (!task_has_dependsOn(task))
    return null;

  for (const id in task.dependsOn) {
    const parent = back.data.tasks[id];

    if (parent.status != 'completed')
      return true;
  }

  return false;
}

/**
 * This function shall be run whenever a task is "touched" by the system for
 * the purpose of updating certain metadata.
 *
 * "touched" defined:
 *   - when the task is getting to be displayed to the user
 *   - when the task is updated by the user
 *
 * It sets backend to dirty on its own.
 *
 * Currently, this is run during:
 *   - query_exec()
 *   - task_set()
 *   - _ui_home_details_signal_changed()
 *
 * Currently hooks are:
 *   - update snoozed
 */
function task_run_ontouch_hook(task) {
  let dirty = false;
  const now = timestamp();

  // update snoozed
  if (task.snoozed < now) {
    delete task.snoozed;
    dirty = true;
  }

  if (dirty)
    back.set_dirty();
}

/**
 * Sets a task as snoozed until tomorrow midnight.
 */
function task_snooze(task, snooze) {
  if (!snooze) {
    const nextDay = new Date();
    nextDay.setDate(nextDay.getDate() + 1);
    nextDay.setHours(0, 0, 0, 0);
    snooze = nextDay.getTime();
  }

  task.snoozed = snooze.getTime ? snooze.getTime() : snooze;

  back.set_dirty();
}

function task_unsnooze(task) {
  delete task.snoozed;

  back.set_dirty();
}

function task_calc_proj_aware_priority(task) {
  let base = task.priority;

  if (task.project === null || typeof task.project === 'undefined') return base;

  const rules = back.data.projectPriorityCoeffRules;
  if (!(rules?.length > 0)) return base;

  let cumulativeCoeff = 1;
  let cumulativeOffset = 0;

  for (let i = 0; i < rules.length; i++) {
    let rule = rules[i];
    if (!rule.query) continue;

    if (rule.query === 'none') {
      if (task.project) continue;
    } else {
      // Compile the regex if not already cached.
      if (!Object.prototype.hasOwnProperty.call(rule, '_compiledRegex')) {
        try {
          let compiled = fzy_compile(rule.query);
          Object.defineProperty(rule, '_compiledRegex', {
            value: compiled,
            enumerable: false,
            configurable: true,
            writable: true
          });
        } catch (e) {
          console.error(e);
          delete rule._compiledRegex;
        }
      }
      if (!rule._compiledRegex || !task.project.match(rule._compiledRegex)) continue;
    }

    cumulativeCoeff *= isNaN(rule.coeff) ? 1 : rule.coeff;
    cumulativeOffset += isNaN(rule.offset) ? 0 : rule.offset;
  }

  return base * cumulativeCoeff + cumulativeOffset;
}

/**
 * Calcs eta of task or task[] using weights done & time spent
 *
 * returns milliseconds of estimated time left
 *
 * returns -1 if N/A
 */
function task_calc_eta(tasks) {
  if (!Array.isArray(tasks))
    tasks = [tasks];

  let total_weights = 0;
  let weights_done = 0;
  let time_tot = 0;

  for (let task of tasks) {
    if (!task.weight)
      continue;

    const progress = task.status == 'completed' ? 100 : task.progress;

    total_weights += task.weight;
    weights_done += task.weight * progress / 100;
    time_tot += task.total;
  }

  const weights_left = total_weights - weights_done;

  if (time_tot && weights_done) {
    const rate = weights_done / time_tot;

    return Math.ceil(weights_left / rate);
  }

  return -1;
}

/*
 * Calcs weight/time rate of task or task[] using weights done & time spent
 *
 * returns rate in weights done over time total
 *
 * returns -1 if N/A
 */
function task_calc_wt_rate(tasks) {
  if (!Array.isArray(tasks))
    tasks = [tasks];

  let total_weights = 0;
  let weights_done = 0;
  let time_tot = 0;

  for (let task of tasks) {
    if (!task.weight)
      continue;

    const progress = task.status == 'completed' ? 100 : task.progress;

    total_weights += task.weight;
    weights_done += task.weight * progress / 100;
    time_tot += task.total;
  }

  if (time_tot && weights_done)
    return weights_done / time_tot;

  return -1;
}


/**
 *
 * @param {boolean} [disable_offset=false] whether to bypass pinning
 */
function task_calc_importance(
  task,
  disable_offset=false, // TODO: refactor this away
  {
    calcDep = true, // whether to recursively sum tasks downstream of dependency
    maxDep = 5, // max levels of recursion
  }={}) {
  let offset = 0;

  if (task.pinned)
    offset += 5000;

  if (disable_offset)
    offset = 0;

  const now = timestamp();

  const adjustedPriority = task_calc_proj_aware_priority(task);

  if (task.status == 'completed' || task.status == 'recur')
    return 0 + offset;

  if (task.status == 'start')
    return 11 * (adjustedPriority + 1) / 11 + offset;

  if (task.until && midnight() > midnight(task.until))
    return 0 + offset;

  // weight 10 vs priority 3
  let weight = (task.weight + 1) / 11 * 10;
  let priority = (adjustedPriority + 1) / 11 * 3;

  let end = task.due || task.until;

  let days_left = end ? (end - now) / 8.64e+7 : 100;
  // account for negative days:
  days_left = days_left >= 0 ? days_left + 1 : 1 / (1 - days_left);

  if (task.earliest && now < task.earliest) {
    // unread tasks also include blocked ones
    days_left *= 100;
    priority -= 1 / 11 * 3;
  }

  if (calcDep && task_has_dependedBy(task)) {
    // perform recusion on blocked priorities
    const stack = [[0, task]];

    while (stack.length) {
      const [depth, parent] = stack.pop();

      for (const childId in (parent.dependedBy || {})) {
        const child = back.data.tasks[childId];

        if (!child)
          continue;

        priority += (task_calc_proj_aware_priority(child)) / 11 * 3 / (depth + 2);

        if (depth < maxDep)
          stack.push([depth + 1, child]);
      }
    }
  }

  days_left = Math.pow(days_left, 2);

  weight /= days_left;

  // 0 is same as null
  if (task.progress) {
    const p = Math.max(Math.min(task.progress, 100), 0);

    weight *= (
      Math.exp(-p / 50) + // exponential decay
      2 / (104 - p) - // goes back to .60 after 85% progress
      0.02
    );
  }

  return weight * priority + priority + offset;
}

function task_set(task) {
  task_run_ontouch_hook(task);

  back.data.tasks[task.id] = task;
  let proj = task && back.data.projects[task.project];
  if (proj) {
    proj.lastUsed = new Date().getTime();
    // IMPORTANT: only responsible for increasing #
    proj.number = (proj.number || 0) + 1;
  }
  back.set_dirty();
}

function task_stringify_due(task) {
  if (task.due)
    return task_stringify_due(task.due);
  else if (task.id)
    return 'None'; // no due date

  let date = new Date(task);
  if (isToday(date))
    return 'Today';
  if (isTomorrow(date))
    return 'Tomorrow';
  return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][date.getDay()] + ' ' +
         (date.getMonth() + 1) + '/' + date.getDate();
}

function task_colorize_due(task) {
  if (task.due)
    return task_stringify_due(task.due);
  else if (task.id)
    return ''; // no due date

  const now = new Date();
  const diff = task - now;
  if (diff <= 0) // overdue/due today
    return 'color: var(--theme-color-red); font-weight: bold;';
  if (diff <= 2.592e+8) // 3 days
    return 'color: var(--theme-color-red);';
  if (diff <= 6.048e+8) // 7 days
    return 'color: var(--theme-color-yellow);'
  else
    return '';
}

function task_parse_date_input(val) {
  val = (val && val.value) || val;
  return new Date(val + 'T00:00:00');
}

/*
 * range for gantt periods,
 * less inclusive than relavant endpoints
 */
function task_gantt_endpoints(task) {
  let start = midnight(task.earliest ? task.earliest : task.created);
  // let now = timestamp();
  let end = midnight();

  if (task.status == 'completed') {
    end = task_completed_stamp(task);
  } else {
    // if before until, either now or due
    // cannot be after until
    if (task.due || task.until)
      end = Math.max(end, task.due || task.until);
    if (task.until && end > task.until)
      end = task.until;
  }

  return [
    start, // start date always earliest/created
    Math.max(start, end) // cannot be before start date
  ];
}

/*
 * the range for when the task is relevant
 */
function task_get_endpoints(task) {
  let start = Math.min(task.created, task.earliest || task.created);
  let end = Math.max(timestamp(), task.due || task.until);
  return [
    Math.min(start, end),
    Math.max(start, end)
  ];
}

function task_is_overlap(task, range, gantt) {
  let e = gantt ? task_gantt_endpoints(task) : task_get_endpoints(task);
  return (e[0] <= range[1]) && (range[0] <= e[1]);
}

function task_delete(task) {
  // need to unlink all dependencies
  for (const childId in (task.dependedBy || {})) {
    const child = back.data.tasks[childId];

    if (!child)
      continue;

    task_set_dependency(child, task, false);
  }
  for (const parentId in (task.dependsOn || {})) {
    const parent = back.data.tasks[parentId];

    if (!parent)
      continue;

    task_set_dependency(task, parent, false);
  }

  delete back.data.tasks[task.id];
  back.set_dirty();

  // also to update dependents' earliest dates
  task_update_dependents(task);

  if (_selected_task?.id == task?.id)
    ui_detail_close();
  else if (_selected_task)
    ui_detail_select_task(_selected_task);
}

/**
 * calls task_dependency_recalc_earliest on each dependent
 *
 * Currently, this is called by:
 *   - task_delete()
 *   - task_complete()
 *   - task_reopen()
 *   - _ui_home_details_signal_changed()
 */
function task_update_dependents(task) {
  let empty = true;

  for (const childId in (task.dependedBy || {})) {
    // prevent infinite loop
    if (childId == task.id)
      continue;

    empty = false;

    const child = back.data.tasks[childId];

    if (!child) {
      delete task.dependedBy[childId];

      back.set_dirty();
      continue;
    }

    task_dependency_recalc_earliest(child);
  }

  if (empty) {
    delete task.dependedBy;
    back.set_dirty();
  }
}

function task_complete(task) {
  task.status = 'completed';
  task.log.push({ type: 'default', time: timestamp(), note: 'Completed.' });

  // also to update dependents' earliest dates
  task_update_dependents(task);

  back.set_dirty();
}

function task_reopen(task) {
  task.status = 'default';
  task.log.push({ type: 'default', time: timestamp(), note: 'Reopened.' });

  // also to update dependents' earliest dates
  task_update_dependents(task);

  back.set_dirty();
}

function task_start(task) {
  if (task.status != 'default') {
    alert('FATAL: Task is not in "default" status.')
    throw 'FATAL: ' + JSON.stringify(task);
  }
  task.status = 'start';
  task.log.push({ type: 'start', time: timestamp() });
  back.data.started = task.id;
  back.set_dirty();
}

function task_validate_log(log) {
  let msg = '';

  if (!Array.isArray(log))
    msg += 'Not an array.\n';

  for (let i = 0;i < log.length;i++) {
    let e = log[i];

    if (!(typeof e === 'object' &&
      !Array.isArray(e) &&
      e !== null)) {
      msg += i + 'th element: not an object.\n';
      continue;
    }

    // 1970 - 2100
    if (!(1 < new Date(e.time) && new Date(e.time) < 4102444800000))
      msg += i + 'th element: "time" property not a valid timestamp within 1970 - 2100.\n';

    switch (e.type) {
      case 'start':
      case '+requires':
      case '-requires':
      case '+blocks':
      case '-blocks':
      case 'default':
        break;
      case 'progress':
        if (!(0 <= e.progress && e.progress <= 100))
          msg += i + 'th element: "progress" property not valid integer from 0-100 for type \'progress\'.\n';
        break;
      default:
        msg += i + 'th element: "type" property not \'start\', \'default\', or \'progress\'.\n';
    }
  }

  return msg || null;
}

function task_gen_readable_log(task) {
  let s = '';
  task.log.forEach(x => {
    s += x.type.substring(0, 3).toUpperCase() + ' ';
    s += new Date(x.time).toLocaleString() + ' ';
    if (!isNaN(x.progress))
      s += ' int=' + x.progress.toString().padStart(2, '0') + ' ';
    // assume dependency here:
    if (x.uuid)
      s += ` "${back.data.tasks[x.uuid]?.name || "[Deleted task]"}"`;
    else if (x.note)
      s += ' "' + x.note + '" ';
    s += '\n';
  });
  return s;
}

/*
 * returns 100% if task is completed after stamp
 *
 * if a task is marked as completed before stamp, even if reopened later,
 * would still return as 100%
 */
function task_progress_at_stamp(task, stamp) {
  let comp = false;
  let p = 0;

  for (let l of task.log) {
    if (l.time > stamp)
      continue;

    if (l.type == 'default' && l.note?.toLowerCase().indexOf('completed') >= 0)
      comp = true;
    else if (l.type == 'default' || l.type == 'start')
      comp = false;
    else if (!comp && l.type == 'progress' )
      p = l.progress;
  }
  return comp ? 100 : p;
}

/**
 * Generates burndown statistics for a task, returning productivity rates,

 * progress, and time data.
 */
function task_gen_burndown_stats(task) {
  const avgRatesData = []; // average rate up to each stamp (instantenous might be a bit funky)
  const progressData = [];
  const timeData = [];
  let totalTime = 0;
  let lastProgress = 0;
  let lastRealProgress = 0;
  let lastTime;

  for (let i = 0; i < task.log.length; i++) {
    let log = task.log[i];

    let isCompletedLog = log.type == 'default' && log.note?.toLowerCase().indexOf('completed') >= 0;
    let isReopenedLog = log.type == 'default' && log.note?.toLowerCase().indexOf('reopened') >= 0;

    if (log.type == 'start') {
      // handle start
      lastTime = log.time;

      timeData.push({ time: log.time, total: totalTime });
      progressData.push({ time: log.time, progress: lastProgress });
      if (totalTime) {
        let rate = (lastProgress / totalTime) * 1000 * 3600; // progress per hr
        avgRatesData.push({ time: log.time, rate: rate });
      }
    } else if (log.type == 'default' && lastTime) {
      // handle stop
      totalTime += log.time - lastTime;

      timeData.push({ time: log.time, total: totalTime });

      lastTime = null;
    } else if (log.type == 'progress' || isCompletedLog || isReopenedLog) {
      // handle progress
      if (isReopenedLog) {
        progressData.push({ time: log.time, progress: 100 });
      }

      lastProgress = log.type == 'progress' ?
        log.progress :
        (isReopenedLog ? lastRealProgress : 100);

      if (log.type == 'progress')
        lastRealProgress = log.progress;

      let adjTotalTime = totalTime;

      if (lastTime) // we're in the middle of a working period
        adjTotalTime += log.time - lastTime;

      progressData.push({ time: log.time, progress: lastProgress });
      if (adjTotalTime) {
        let rate = (lastProgress / adjTotalTime) * 1000 * 3600; // progress per hr
        avgRatesData.push({ time: log.time, rate: rate });
      }
    }
  }


  if (task.status != 'completed') {
    let currentTime = timestamp();
    let currentTotalTime = totalTime + (lastTime ? currentTime - lastTime : 0);
    let currentRate = (lastProgress / currentTotalTime) * 1000 * 3600 || 0; // progress per hr

    avgRatesData.push({ time: currentTime, rate: currentRate });
    progressData.push({ time: currentTime, progress: lastProgress });
    timeData.push({ time: currentTime, total: currentTotalTime });
  }

  return {
    avgRatesData: avgRatesData,
    progressData: progressData,
    timeData: timeData
  };
}



function task_update_progress(task, progress, note) {
  task.progress = Math.max(Math.min(progress, 100), 0);

  let now = timestamp();

  // delete nearest 5min progress
  task.log = task.log
    .filter(x => !(x.type == 'progress' && !x.note && Math.abs(now - x.time) < 300000));

  let log = { type: 'progress', time: now, progress: task.progress };

  if (note)
    log.note = note;

  task.log.push(log);
  back.set_dirty();
}

/*
 * returns total diff (new - old) and sets proper total without back.set_dirty()
 */
function task_recalc_total(task) {
  let ot = task.total;

  let tot = 0;
  let periods = task_gen_working_periods(task);
  periods.forEach(x => {
    tot += x.to - x.from;
  });

  return (task.total = tot) - ot;
}

function task_pause(task) {
  task.status = 'default';
  task.log.push({ type: 'default', time: timestamp() });
  delete back.data.started;

  // // aggregate to total time spent
  // let start = task_get_latest_start_stamp(task);
  // if (start)
  //   task.total += timestamp() - start;

  task_recalc_total(task);

  back.set_dirty();
}

function task_get_latest_start_stamp(task) {
  for (let i = task.log.length - 1; i >= 0;i--) {
    let log = task.log[i];
    if (log?.type == 'start')
      return log.time;
  }
  return null;
}

/**
 * returns the final completion date (including in the future), or the until
 * date, or 0
 */
function task_completed_stamp(task) {
  let def = Math.min(task.until, timestamp());
  let d = def;
  for (let l of task.log) {
    if (l.type == 'default' && l.note?.toLowerCase().indexOf('completed') >= 0)
      d = l.time;
    else if (l.type == 'default' || l.type == 'start')
      d = def;
  }
  return d;
}

/*
 * STA -> DEF
 * STA -> now
 *
 * [capRange: [from, to]]
 */
function task_gen_working_periods(task, capRange) {
  let periods = [];
  capRange = capRange || [-Infinity, Infinity];

  let start;
  for (let log of task.log) {
    if (log.type == 'start') {
      start = Math.max(capRange[0], log.time);
    } else if (log.type == 'default' && start) {
      let end = Math.min(capRange[1], log.time);

      if (end > start)
        periods.push({ from: start, to: end, task: task });

      start = null;
    }
  }

  if (start) {
    let end = Math.min(capRange[1], timestamp());

    if (end > start)
      periods.push({ from: start, to: end, task: task });
  }

  return periods;
}

function task_get_prog_user_steps(task) {
  const steps = task.steps || 100;
  return Math.round((task.progress || 0) / 100 * steps);
}
