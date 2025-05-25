const _timer_audiocontext = new (window.AudioContext || window.webkitAudioContext)();

let $timer_container = $('#timer-container');
let _timer_interval_id;
let _timer_stamp;

let _timer_pomodoro_start;

let _timer_blink_cancel_callback = () => {};

function timer_get_user_pomotick() {
  return back.data.settings.pomodoro || 25;
}
function timer_get_user_breaktime() {
  return back.data.settings.pomodoroBreakTime || 5;
}

function timer_start_task(task) {
  // does nothing if unset
  clearInterval(_timer_interval_id);

  _timer_pomodoro_stop();
  _timer_pomodoro_break_cleanup();

  $timer_container.find('name').text(task.name);
  $timer_container.find('subname').addClass('_hidden');
  $timer_container.find('timer:not(.pomodoro)').text('0:00:00.0');
  $timer_container.find('.pomodoro-btn').removeClass('folded');
  $timer_container.find('.pomodoro-break-btn').addClass('folded');

  _timer_stamp = task_get_latest_start_stamp(task) || timestamp();

  _timer_interval_id = setInterval(() => {
    $timer_container
      .find('timer:not(.pomodoro)')
      .text(timeIntervalString(timestamp(), _timer_stamp));

    if (!_timer_pomodoro_start)
      return;

    const pom_offset = 60000 * timer_get_user_pomotick();
    const pom_end = _timer_pomodoro_start + pom_offset;
    if (pom_end > timestamp()) {
      $timer_container
        .find('timer.pomodoro')
        .text(timeIntervalString(timestamp(), pom_end));

      const perc = Math.round((100 - (pom_end - timestamp()) / pom_offset * 100));

      $timer_container.find('.pomodoro-progress .bar')
        .css('width', perc + '%');
    } else {
      // time's up

      _timer_blink_cancel_callback = _timer_blink_title();

      _timer_pomodoro_beep_bursts();

      _timer_pomodoro_stop();

      if (
        back.data.settings.autostartPomobreak &&
        !task.noPomoBreak
      ) {
        timer_pomodoro_break(task);
      }
    }
  }, 100);

  $timer_container
    .show()
    .attr('style', 'opacity: 1;');

  if (back.data.settings.autostartPomo) {
    timer_pomodoro($timer_container.find('.pomodoro-btn'));
  }
}

let _pomodoro_break_saved_task = null;
function timer_pomodoro_break(oldTask) {
  timer_stop_task(_pomodoro_break_saved_task = oldTask, false);

  $timer_container.find('name').text(`Break Time`);
  $timer_container.find('subname').removeClass('_hidden').text(`Next: ${oldTask.name}`);
  $timer_container.find('.pomodoro-btn').addClass('folded');
  $timer_container.find('.pomodoro-break-btn').removeClass('folded');

  $timer_container.find('timer:not(.pomodoro)').addClass('moved');
  $timer_container.find('.pomodoro-progress').addClass('active')
    .find('.bar').css('width', '0');

  _timer_stamp = timestamp();
  _timer_pomodoro_start = timestamp();

  _timer_interval_id = setInterval(() => {
    $timer_container
      .find('timer:not(.pomodoro)')
      .text(timeIntervalString(timestamp(), _timer_stamp));

    if (!_timer_pomodoro_start)
      return;

    const pom_offset = 60000 * timer_get_user_breaktime();
    const pom_end = _timer_pomodoro_start + pom_offset;
    if (pom_end > timestamp()) {
      $timer_container
        .find('timer.pomodoro')
        .text(timeIntervalString(timestamp(), pom_end));

      const perc = Math.round((100 - (pom_end - timestamp()) / pom_offset * 100));

      $timer_container.find('.pomodoro-progress .bar')
        .css('width', perc + '%');
    } else {
      // time's up

      _timer_blink_cancel_callback = _timer_blink_title();

      _timer_pomodoro_beep_bursts();

      _timer_pomodoro_stop();
    }
  }, 100);
}

function timer_pomodoro_restart_from_break() {
  if (
    _pomodoro_break_saved_task &&
    !back.data.started &&
    back.data.tasks[_pomodoro_break_saved_task.id]
  ) {
    const restart = _pomodoro_break_saved_task;
    timer_stop_task(restart, false);
    task_start(restart);
    timer_start_task(restart);

    if (_selected_task || _ui_menu_current_menu == 'home')
      ui_menu_select_home();
  } else {
    timer_stop_task(_pomodoro_break_saved_task, true);
  }

  _pomodoro_break_saved_task = null;
}

function _timer_pomodoro_break_cleanup() {
  $timer_container.find('subname').addClass('_hidden').text('');
  $timer_container.find('.pomodoro-btn').removeClass('folded');
  $timer_container.find('.pomodoro-break-btn').addClass('folded');
}

function timer_pomodoro(btn) {
  btn = $(btn);

  // if already started, stop
  if (_timer_pomodoro_start) {
    _timer_pomodoro_stop();
    return;
  }

  // start timer
  _timer_pomodoro_start = timestamp();
  $timer_container.find('timer:not(.pomodoro)').addClass('moved');
  $timer_container.find('.pomodoro-btn').addClass('active');
  $timer_container.find('.pomodoro-progress').addClass('active')
    .find('.bar').css('width', '0');
}

function _timer_pomodoro_stop() {
  $timer_container.find('timer:not(.pomodoro)').removeClass('moved');
  $timer_container.find('.pomodoro-btn').removeClass('active');
  $timer_container.find('.pomodoro-progress').removeClass('active')
    .find('.bar').css('width', '0');
  $timer_container.find('timer.pomodoro').text('');
  _timer_pomodoro_start = null;
}

function timer_stop_task(task, hideContainer=true) {
  if (back.data.tasks[back.data.started])
    task_pause(back.data.tasks[back.data.started]);

  _timer_blink_cancel_callback();

  _timer_pomodoro_stop();

  _timer_pomodoro_break_cleanup();

  // does nothing if unset
  clearInterval(_timer_interval_id);

  if (_selected_task || _ui_menu_current_menu == 'home')
    ui_menu_select_home();

  if (hideContainer) {
    $timer_container
      .removeClass('_hidden')
      .hide();
  }
}

function timer_hide() {
  $timer_container
    .addClass('_hidden');
}
function timer_unhide() {
  $timer_container
    .removeClass('_hidden');
}

function _timer_pomodoro_beep_bursts() {
  const func = () => {
    const oscillator = _timer_audiocontext.createOscillator();

    oscillator.type = 'sine';

    oscillator.frequency.setValueAtTime(440, _timer_audiocontext.currentTime);

    oscillator.connect(_timer_audiocontext.destination);

    oscillator.start();
    oscillator.stop(_timer_audiocontext.currentTime + 0.2);
  }

  func();
  setTimeout(func, 400 + 200);
  setTimeout(func, (400 + 200) * 2);

  setTimeout(func, (400 + 200) * 5);
  setTimeout(func, (400 + 200) * 6);
  setTimeout(func, (400 + 200) * 7);
}

function _timer_blink_title() {
  const originalTitle = document.title;
  const favicon = document.querySelector("link[rel~='icon']");
  const newFavicon = document.createElement("link");
  const originalImage = favicon.href;
  // 1px red square
  const redSquare = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAAXNSR0IArs4c6QAAAA1JREFUGFdj+M/A8B8ABQAB/6Zcm10AAAAASUVORK5CYII=";

  console.debug('blink');

  let blinkSeq = 0;
  let blinking = setInterval(() => {
    switch (blinkSeq++ % 6) {
      case 0:
        favicon.href = redSquare;
        document.title = "Time's up!";
        break;
      case 1:
        favicon.href = originalImage;
        document.title = "Time's up!!";
        break;
      case 2:
        favicon.href = redSquare;
        document.title = "Time's up!!!";
        break;
      case 3:
        favicon.href = originalImage;
        document.title = "Time's up!!!!";
        break;
      case 4:
        favicon.href = redSquare;
        document.title = "Time's up!!!!!";
        break;
      case 5:
        favicon.href = originalImage;
        document.title = "\u200E"; // invisible placeholder
        break;
    }
  }, 400);

  let _isCanceled = false;
  function cancel() {
    if (_isCanceled) return;

    clearInterval(blinking);
    document.title = originalTitle;
    favicon.href = originalImage;

    _isCanceled = true;
  }

  // stop after 10 seconds
  setTimeout(() => {
    cancel();
  }, 10000);

  return cancel;
}
