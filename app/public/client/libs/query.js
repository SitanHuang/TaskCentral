/*
 * query : {
 *   queries: [{
 *     from: time,
 *     to: time,
 *     projectRegex: null, // "none" | fuzzy string
 *     projects: [], // list or projects (OR filter)
 *     status: [], // OR filter
 *     hidden: null,
 *     name: null, // contains or regex
 *     useGantt: false, // use gantt endpoints
 *     due: null,
 *     collect: [
 *       'tasks', // return task entries
 *     ]
 *   }]
 * }
 */
function query_exec(query) {
  if (!query.queries.length)
    return [];

  let data = [];

  let _range_min;
  let _range_max;

  let now = timestamp();

  // Creating a set so that the first loop can eliminate
  // based on nonoverlapping time
  let tasks = new Set(Object.keys(back.data.tasks));

  for (let q of query.queries) {
    // -------- set up query --------
    _range_min = Math.min(_range_min || q.from, q.from);
    _range_max = Math.max(_range_max || q.to, q.to);

    q.projects = q.projects || [];
    q.status = q.status || [];
    q.hidden = typeof q.hidden == "boolean" ? q.hidden : null;
    q.due = typeof q.due == "boolean" ? q.due : null;

    q._readyOnly = q.status.includes('ready');
    q._weightOnly = q.status.includes('weight');
    q._includeSnoozed = q.status.includes('snoozed');
    q._includeDefault = q.status.includes('default');

    q._range = [q.from, q.to];

    // regex can't be serialized to JSON
    // use underscore to preserve original query
    q._projectRegex = q.projectRegex ? fzy_compile(q.projectRegex) : null;
    q._nameRegex = q.name ? fzy_compile_name(q.name) : null;

    let d = { from: q.from, to: q.to };
    data.push(d);

    for (let c of q.collect) {
      switch (c) {
        case 'tasks':
          d.tasks = [];
          break;
        default:
          throw `Unknown collect method: ${c}`;
      }
    }

  }

  const _range = [_range_min, _range_max];

  // -------- actual query --------
  for (const uuid of tasks) {
    const task = back.data.tasks[uuid];

    // get most current earliest date based on dependencies
    task_dependency_recalc_earliest(task);

    task_recur_recalc(task);

    if (!task_is_overlap(task, _range)) {
      // remove from set so the next query doesn't waste time
      tasks.delete(uuid);
      continue;
    }

    for (let i = 0;i < query.queries.length;i++) {
      const q = query.queries[i];

      // a task might fulfill the overall range but
      // not the range of a specific query
      if (!task_is_overlap(task, q._range, q.useGantt))
        continue; // go to next query

      // ------- exclusive conditions -------

      if (q.hidden !== null && q.hidden !== task.hidden)
        continue;
      if (q.due !== null && (q.due != (!!task.due)))
        continue;

      if (q.projects.length) {
        // q.projects can have null value
        // if (!task.project) // task has no project
        //   continue;
        let matched = false;
        for (let p of q.projects) {
          if (p == task.project) {
            matched = true;
            break; // only need 1 match
          }
        }
        if (!matched)
          continue;
      }
      if (q.status.length) {
        let matched = false;
        for (let p of q.status) {
          if (p == task.status || (p == 'snoozed' && task.snoozed > now)) {
            matched = true;
            break; // only need 1 match
          }
        }

        // for case if user is only selecting "snoozed" but not "default":
        // exclude any task that is not snoozed
        if (q._includeSnoozed && !(task.snoozed > now) && !q._includeDefault)
          continue;

        if (!matched)
          continue;

        // check for ready:
        // exclude those that aren't ready
        if (q._readyOnly && (task.earliest ? now < task.earliest : false))
          continue;

        // check for weight:
        // exclude those that are weightless
        if (q._weightOnly && !task.weight)
          continue;

        // check for snoozed exclusion:
        if (!q._includeSnoozed && task.snoozed > now)
          continue;
      }

      if (q.projectRegex == 'none') {
        if (task.project)
          continue;
      } else if (q._projectRegex && !task?.project?.match(q._projectRegex)) {
        continue;
      }

      if (q._nameRegex && !task?.name?.match(q._nameRegex))
        continue;

      // ----------- collect -----------
      if (q.collect.indexOf('tasks') >= 0) {
        task_run_ontouch_hook(task);

        data[i].tasks.push(task);
      }
    }
  }

  return data;
}

/*
 * range should be local midnights
 */
function query_generate_gantt_tracks(tasks, range) {
  let periods = _query_generate_gantt_periods(tasks, range);

  periods = periods.sort((a, b) =>
    // sort by duration, longest periods go on top tracks
    ((b.to - b.from) - (a.to - a.from)) ||
    // if difference == 0, importance is next
    (task_calc_importance(b.task) - task_calc_importance(a.task)) ||
    // if completed or importance = 0, use weight then priority
    (b.weight - a.weight) ||
    (task_calc_proj_aware_priority(b) - task_calc_proj_aware_priority(a))
  );

  let tracks = [];

  for (let period of periods) {
    let track;

    // try out each track to see if available
    TRACK:
    for (let t of tracks) {
      // check overlap
      for (let p2 of t) {
        if (isOverlapping([period.from, period.to], [p2.from, p2.to]))
          continue TRACK;
      }
      // if nothing overlap, use track
      track = t;
      break;
    }

    // if no existing track available
    if (!track)
      tracks.push(track = []);

    track.push(period);
  }

  return tracks;
}

function _query_generate_gantt_periods(tasks, range) {
  let [from, to] = range;
  let periods = [];

  for (let task of tasks) {
    const [f, t] = task_gantt_endpoints(task).map(x => roundDateToNearestDay(x).getTime());

    // out of range
    if (f > to || t < from)
      continue;

    // truncate range
    let nf = Math.max(f, from);
    let nt = Math.min(t, to);

    let period = {
      actualFrom: f,
      actualTo: t,
      from: nf,
      to: nt,
      task: task,
      // useful for deciding whether or not to
      // use rounded corners in gantt
      startCapped: f != nf,
      endCapped: t != nt
    };

    periods.push(period);
  }

  return periods;
}

function query_generate_log_daily_tasks(query, date) {
  date = new Date(date);
  query = JSON.parse(JSON.stringify(query));

  query.queries[0].from = date.getTime();
  // next midnight
  date.setDate(date.getDate() + 1);
  query.queries[0].to = date.getTime();

  return query_exec(query)[0].tasks;
}

function query_generate_log_daily_periods(tasks, date) {
  date = new Date(date);

  const from = date.getTime();

  // next midnight
  date.setDate(date.getDate() + 1);
  const to = date.getTime();

  return query_generate_log_periods(tasks, from, to);
}

function query_generate_log_periods(tasks, from, to) {
  const range = [from, to];

  const periods = [];

  for (const task of tasks) {
    const p = task_gen_working_periods(task, range);
    // fastest way to concat (https://dev.to/uilicious/javascript-array-push-is-945x-faster-than-array-concat-1oki)
    Array.prototype.push.apply(periods, p);
  }

  return periods;
}
