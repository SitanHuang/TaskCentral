const _timer_audiocontext = new (window.AudioContext || window.webkitAudioContext)();

let $timer_container = $('#timer-container');
let _timer_interval_id;
let _timer_stamp;

let _timer_pomodoro_start;

let _timer_blink_cancel_callback = () => {};

function timer_start_task(task) {
  // does nothing if unset
  clearInterval(_timer_interval_id);

  $timer_container.find('name').text(task.name);
  $timer_container.find('timer:not(.pomodoro)').text('0:00:00.0');

  _timer_stamp = task_get_latest_start_stamp(task) || timestamp();

  _timer_interval_id = setInterval(() => {
    $timer_container
      .find('timer:not(.pomodoro)')
      .text(timeIntervalString(timestamp(), _timer_stamp));

    if (!_timer_pomodoro_start)
      return;

    const pom_offset = 60000 * (back.data.settings.pomodoro || 25);
    const pom_end = _timer_pomodoro_start + pom_offset;
    if (pom_end > timestamp()) {
      $timer_container
        .find('timer.pomodoro')
        .text(timeIntervalString(timestamp(), pom_end));
    } else {
      // time's up

      _timer_blink_cancel_callback = _timer_blink_title();

      _timer_pomodoro_beep_bursts();
      setTimeout(_timer_pomodoro_beep_bursts, 400 + 200);
      setTimeout(_timer_pomodoro_beep_bursts, (400 + 200) * 2);

      setTimeout(_timer_pomodoro_beep_bursts, (400 + 200) * 5);
      setTimeout(_timer_pomodoro_beep_bursts, (400 + 200) * 6);
      setTimeout(_timer_pomodoro_beep_bursts, (400 + 200) * 7);
      _timer_pomodoro_stop();
    }
  }, 100);

  $timer_container
    .show()
    .attr('style', 'opacity: 1;');
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
  $timer_container.find('.pomodoro-btn').addClass('active');
}

function _timer_pomodoro_stop() {
  $timer_container.find('.pomodoro-btn').removeClass('active');
  $timer_container.find('timer.pomodoro').text('');
  _timer_pomodoro_start = null;
}

function timer_stop_task(task) {
  task_pause(back.data.tasks[back.data.started]);

  _timer_blink_cancel_callback();

  _timer_pomodoro_stop();

  // does nothing if unset
  clearInterval(_timer_interval_id);
  $timer_container
    .removeClass('_hidden')
    .hide();
  if (_selected_task || _ui_menu_current_menu == 'home')
    ui_menu_select_home();
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
  const oscillator = _timer_audiocontext.createOscillator();

  oscillator.type = 'sine';

  oscillator.frequency.setValueAtTime(440, _timer_audiocontext.currentTime);

  oscillator.connect(_timer_audiocontext.destination);

  oscillator.start();
  oscillator.stop(_timer_audiocontext.currentTime + 0.2);
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
