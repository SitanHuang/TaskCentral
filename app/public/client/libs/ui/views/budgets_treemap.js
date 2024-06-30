const BUDGET_TREEMAP_DEFAULT_QUERY = {
  queries: [{
    status: [],
    hidden: null,
    collect: ['tasks'],
    from: 0,
    to: new Date(2100, 1, 1).getTime()
  }]
};

let _ui_trackers_treemap_query = JSON.parse(JSON.stringify(BUDGET_TREEMAP_DEFAULT_QUERY));

function ui_trackers_treemap_onclick() {
  ui_filter_open(
    _ui_trackers_treemap_query,
    _ui_trackers_treemap_filter_callback
  );
}

async function _ui_trackers_treemap_filter_callback(query) {
  // =================== data generation ===================

  const tasks = query_exec(_ui_trackers_treemap_query)[0].tasks;
  const from = query.from;
  const to = query.to;

  const projectSums = new Map();

  for (const task of tasks) {
    const project = task.project || 'No Project';
    const taskPath = project + '.' + task.name.replace(/\./g, ' ');

    let taskSum = 0;

    const periods = task_gen_working_periods(task, [from, to]);

    for (const period of periods) {
      taskSum += period.to - period.from;
    }

    // exclude tasks with less than 1 minute durations
    if (taskSum <= 60 * 1000)
      continue;

    if (taskSum >= 3.156e+10) { // 365 days
      if (await ui_confirm(
        `Task "${task.name}" has ${timeIntervalStringShort(taskSum, 0, 9)} ` +
        `tracked time, which is possibly wrong. ` +
        `Would you like to inspect this task's log right now?`, {
          cancelTxt: "No",
          okayTxt: "Yes",
        })) {
        ui_menu_select('home');
        ui_detail_select_task(task);
        return;
      }

    }

    // sum parent logic from ledg
    const levels = taskPath.split(".");
    let parentPath = "";
    for (const currentLevel of levels) { // from top to bottom, left to right
      const currentPath = parentPath + currentLevel;

      projectSums.set(currentPath, (projectSums.get(currentPath) || 0) + taskSum);

      parentPath = currentPath + ".";
    }
  }

  // =================== graph generation ===================

  const labels = [];
  const parents = [];
  const values = [];
  const colors = [];
  const text = [];

  for (const [key, value] of projectSums) {
    const split = key.split('.');

    labels.push(key);
    parents.push(split.slice(0, -1).join('.'));
    values.push(value / 1000 / 60 / 60); // to hour

    text.push(
      back.data.projects[key] ?
        split[split.length - 1] :
        `"${split[split.length - 1]}"` // is just a task
    );

    let color = back.data.projects.default.color;

    let currentSplit = split;
    while (currentSplit.length >= 1) {
      let proj = back.data.projects[currentSplit.join(".")];

      if (proj) {
        color = proj.color;
        break;
      }

      currentSplit = currentSplit.slice(0, -1);
    }

    colors.push(color);
  }

  Plotly.react(
    _trackers_con.find('.treemap-chart')[0],
    [
      {
        type: "treemap",
        branchvalues: "total",

        labels,
        parents,
        values,
        text,

        domain: { x: [0, 1] },
        texttemplate: "<b>%{text}</b>: %{value:.1f} hr<br>" +
          "%{percentParent} of %{parent}<br>" +
          "%{percentEntry} of Screen",
        marker: { line: { width: 2 }, colors },
        maxdepth: 2,

        pathbar: { "visible": true }
      }
    ],
    {
      height: Math.ceil(Math.min(450, 1.5 * window.innerWidth, window.innerHeight * 0.75)),
      margin: { l: 10, b: 10, t: 50, r: 10, autoexpand: true },
      title: `${new Date(query.from).toLocaleDateString()} to ${new Date(query.to).toLocaleDateString()}`,
    },
    { responsive: true }
  );

  _trackers_con.find('.treemap-chart svg.main-svg')
    .addClass('force-transparent-bg');

  _trackers_con.find('.treemap-chart')
    .css('min-height', 450)
    .css('margin-bottom', '1em');
}