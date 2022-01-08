let $timer_container = $('#timer-container');
let _timer_interval_id;
let _timer_stamp;

function timer_start_task(task) {
  // does nothing if unset
  clearInterval(_timer_interval_id);

  $timer_container.find('name').text(task.name);
  $timer_container.find('timer').text('0:00:00.0');

  _timer_stamp = task_get_latest_start_stamp(task) || timestamp();

  _timer_interval_id = setInterval(() => {
    let delta = Math.abs(timestamp() - _timer_stamp) / 1000;
    
    let hours = Math.floor(delta / 3600) % 24;
    delta -= hours * 3600;
    
    let minutes = Math.floor(delta / 60) % 60;
    delta -= minutes * 60;

    let seconds = (Math.round(delta % 60 * 10) / 10).toFixed(1);

    $timer_container
      .find('timer')
      .text(`${hours}:${minutes.toString().padStart(2, '0')}:${seconds.padStart(4, '0')}`);
  }, 100);

  $timer_container
    .show()
    .attr('style', 'opacity: 1;');
}

function timer_stop_task(task) {
  // does nothing if unset
  clearInterval(_timer_interval_id);
  $timer_container
    .hide();
  if (_selected_task)
    ui_menu_select_home();
}