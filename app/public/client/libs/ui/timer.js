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
    $timer_container
      .find('timer')
      .text(timeIntervalString(timestamp(), _timer_stamp));
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