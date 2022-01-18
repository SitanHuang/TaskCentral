let _forecast_con;
let _forecast_mtime;
let _forecast_css_inserted;

function ui_menu_select_forecast() {
  _forecast_con = $('.content-container > div.forecast');

  let target_provider = () => FORECAST_QUERY;
  let callback_provider = () => ui_forecast_render;

  if (_forecast_mtime != (_forecast_mtime = back.mtime))
    ui_forecast_render();

  ui_filter_update_holders(target_provider, callback_provider);
}

const FORECAST_DEFAULT_QUERY = (() => {
  let query = {
    queries: [{
      status: [],
      collect: ['tasks'],
    }]
  };
  // default 2 days ago to 1 month later

  let now = new Date();

  now.setHours(0, 0, 0, 0); // set to midnight

  now.setDate(now.getDate() - 2);
  query.queries[0].from = now.getTime();

  now.setDate(now.getDate() + 2);
  now.setMonth(now.getMonth() + 1);
  query.queries[0].to = now.getTime();

  return query;
})();

FORECAST_QUERY = JSON.parse(JSON.stringify(FORECAST_DEFAULT_QUERY));


// should only be executed on initial load/query change
function ui_forecast_render() {
  console.time('Re-render forecast');

  let width = window.innerWidth - 50;
  let height = window.innerHeight - 150;

  let container = _forecast_con.find('.forecast-container');
  container.html(`<div id="forecastGraph" style="width: ${width}px;height: ${height}px"></div>`);

  // if more than 1 year
  if (1 < (FORECAST_QUERY.queries[0].to - FORECAST_QUERY.queries[0].from) / 3.154e+10) {
    if (!confirm('Query range is too big. App might freeze. Continue?'))
      return false;
  }

  let range = [FORECAST_QUERY.queries[0].from, FORECAST_QUERY.queries[0].to];
  let [from, to] = range;

  let tasks = query_exec(FORECAST_QUERY)[0].tasks;
  let periods = _query_generate_gantt_periods(tasks, range);
  
  let days = Math.ceil((to - from) / 8.64e+7) + 2;
  let stress = Array(days).fill(0).map(() => []);

  for (let period of periods) {
    let task = period.task;
    let days = Math.ceil((period.to - period.from) / 8.64e+7) + 1;
    let stressPerDay = ((task.weight) * (task.priority)) / days / 5 / 5;

    let startIndex = Math.floor((period.from - from) / 8.64e+7);

    for (let index = 0; index < days; index++) {
      stress[index + startIndex].push(stressPerDay);
    }

    let prev = 0;
    for (let log of task.log) {
      if (log.type == 'progress') {
        if (log.time < period.from) {
          stress[startIndex].push(stressPerDay * (prev - log.progress) / 100);
        } else if (log.time < period.to) {
          let index = Math.ceil((roundDateToNearestDay(log.time).getTime() - from) / 8.64e+7);
          stress[index].push(stressPerDay * (prev - log.progress) / 100);
        }
        prev = log.progress;
      }
    }

    let endIndex = Math.floor((period.to - from) / 8.64e+7);
    stress[endIndex].push(-0.2 * stressPerDay * days);
    stress[endIndex + 1].push(-0.8 * stressPerDay * days);
  }

  let data = [];
  let j = 0;
  let sum = 0;
  let now = midnight();

  for (let i = new Date(from);j < stress.length;i.setDate(i.getDate() + 1) && j++) {
    sum += stress[j].reduce((a, b) => a + b, 0);

    let total = NaN;

    if (i < now + 8.64e+7) {
      let periods = query_generate_log_daily_periods(tasks, i);
      total = 0;
      for (let period of periods) {
        total += (period.to - period.from) / 3.6e+6; // hours
      }
    }

    data.push({ date: new Date(i), s: sum, t: total });
  }

  console.log(stress, data)

  let d3 = d3_timeseries()
            .addSerie(
              data,
              { x:'date', y: 't' },
              { interpolate: 'monotone', color: '#d5d5d5' }
            )
            .addSerie(
              null,
              { x:'date', y: 's' },
              { interpolate: 'monotone', color: '#db4437' }
            )
            .width(width)
            .height(height);
  
  d3('#forecastGraph');
  console.timeEnd('Re-render forecast');
}