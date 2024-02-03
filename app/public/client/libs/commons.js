function timestamp(a) {
  return (a || new Date()).getTime();
}

function closestPreviousMonday(date) {
  date = new Date(date || midnight());
  const day = date.getDay();
  const daysToSubtract = (day + 6) % 7;
  const closestMonday = new Date(date);
  closestMonday.setDate(date.getDate() - daysToSubtract);
  return closestMonday.getTime();
}

function addDateByMonthWeekDay(date, [month, week, day]) {
  const result = new Date(date);
  result.setMonth(result.getMonth() + month);
  result.setDate(result.getDate() + (week * 7 + day));
  return result;
}

function midnight(a) {
  let date = new Date((a || new Date()));
  date.setHours(0, 0, 0, 0);
  return date.getTime();
}

function uuidv4() {
  return ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g, c =>
    (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
  );
}

function isToday(d) {
  const today = new Date();
  return d.getDate() == today.getDate() &&
    d.getMonth() == today.getMonth() &&
    d.getFullYear() == today.getFullYear()
}

function isTomorrow(d) {
  const today = new Date();
  today.setDate(today.getDate() + 1);
  return d.getDate() == today.getDate() &&
    d.getMonth() == today.getMonth() &&
    d.getFullYear() == today.getFullYear()
}

function fontColorFromHex(color) {
  const red = parseInt(color.substring(1,3),16);
  const green = parseInt(color.substring(3,5),16);
  const blue = parseInt(color.substring(5,7),16);
  const brightness = red*0.299 + green*0.587 + blue*0.114;
  return brightness > 180 ? 'black' : 'white';
}

function timeIntervalString(final, initial) {
  initial = initial || 0;
  let delta = Math.abs(final - initial) / 1000;

  let hours = Math.floor(delta / 3600);
  delta -= hours * 3600;

  let minutes = Math.floor(delta / 60) % 60;
  delta -= minutes * 60;

  let seconds = (Math.round(delta % 60 * 10) / 10).toFixed(1);
  return (final - initial < 0 ? '-' : '' ) + `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.padStart(4, '0')}`;
}

function timeIntervalStringShort(final, initial = 0, maxLevel = 1) {
  let delta = Math.abs(final - initial) / 1000; // Convert to seconds
  const sign = (final - initial < 0 ? '-' : '');

  // use PomoTick unit if maxLevel < day
  if (back.data?.settings?.usePomoticks && maxLevel >= 0 && maxLevel < 2) {
    const PT = timer_get_user_pomotick() * 60;

    if (delta >= PT * 0.1) {
      let pts = delta / PT;
      return sign + pts.toFixed(1) + 'PT';
    }

    return sign + delta.toFixed(1) + 's';
  }

  const MINUTE = 60;
  const HOUR = 3600;
  const DAY = 86400; // 24 hours
  const WEEK = 604800; // 7 days
  const MONTH = 2592000; // 30 days

  if (delta >= MONTH && maxLevel >= 4) {
    let months = delta / MONTH;
    return sign + months.toFixed(1) + 'mo';
  } else if (delta >= WEEK && maxLevel >= 3) {
    let weeks = delta / WEEK;
    return sign + weeks.toFixed(1) + 'w';
  } else if (delta >= DAY && maxLevel >= 2) {
    let days = delta / DAY;
    return sign + days.toFixed(1) + 'd';
  } else if (delta >= HOUR && maxLevel >= 1) {
    let hrs = delta / HOUR;
    return sign + hrs.toFixed(1) + 'hr';
  } else if (delta >= MINUTE && maxLevel >= 0) {
    let min = delta / MINUTE;
    return sign + min.toFixed(1) + 'min';
  }

  return sign + delta.toFixed(1) + 's';
}


function onPasteFormatRemovalHandler(elem, e) {
  if (e.originalEvent && e.originalEvent.clipboardData && e.originalEvent.clipboardData.getData) {
    e.preventDefault();
    var text = e.originalEvent.clipboardData.getData('text/plain');
    window.document.execCommand('insertText', false, text);
  } else if (e.clipboardData && e.clipboardData.getData) {
    e.preventDefault();
    var text = e.clipboardData.getData('text/plain');
    window.document.execCommand('insertText', false, text);
  }
}

/*
 * find closest local midnight
 */
function roundDateToNearestDay(date) {
  date = new Date(date);
  let tz = date.getTimezoneOffset() * 60000;
  // 1. nearest 4 hours (US max timezone difference=3)
  // 2. nearest day

  let localMidNight = new Date(date);
  localMidNight.setHours(0,0,0,0);

  // if date within 4 hours of next midnight,
  // use next midnight
  if (date - localMidNight >= (24 - 4) * 3.6e+6)
    localMidNight.setDate(localMidNight.getDate() + 1);

  return localMidNight;
}

function isOverlapping(r1, r2) {
  return (r1[0] <= r2[1]) && (r2[0] <= r1[1]);
}

function throttle(fn, wait) {
  let time = Date.now();
  return function () {
    if ((time + wait - Date.now()) < 0) {
      fn();
      time = Date.now();
    }
  }
}

function increaseHexBrightness(hex, percent){
  // strip the leading # if it's there
  hex = hex.replace(/^\s*#|\s*$/g, '');

  // convert 3 char codes --> 6, e.g. `E0F` --> `EE00FF`
  if(hex.length == 3){
    hex = hex.replace(/(.)/g, '$1$1');
  }

  let r = parseInt(hex.substr(0, 2), 16),
      g = parseInt(hex.substr(2, 2), 16),
      b = parseInt(hex.substr(4, 2), 16);

  return '#' +
    ((0|(1<<8) + r + (256 - r) * percent / 100).toString(16)).substr(1) +
    ((0|(1<<8) + g + (256 - g) * percent / 100).toString(16)).substr(1) +
    ((0|(1<<8) + b + (256 - b) * percent / 100).toString(16)).substr(1);
}

function humanFileSize(bytes, si=false, dp=1) {
  const thresh = si ? 1000 : 1024;

  if (Math.abs(bytes) < thresh)
    return bytes + ' B';

  const units = si
    ? ['kB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB']
    : ['KiB', 'MiB', 'GiB', 'TiB', 'PiB', 'EiB', 'ZiB', 'YiB'];
  let u = -1;
  const r = 10**dp;

  do {
    bytes /= thresh;
    ++u;
  } while (Math.round(Math.abs(bytes) * r) / r >= thresh && u < units.length - 1);


  return bytes.toFixed(dp) + ' ' + units[u];
}

function isFirefox() {
  return typeof navigator !== 'undefined' && navigator.userAgent.includes('Firefox');
}

function sanitizeHTMLSafe(str) {
  const ele = document.createElement('body');
  ele.innerText = str;
  return ele.innerHTML;
}