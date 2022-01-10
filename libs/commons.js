function timestamp(a) {
  return (a || new Date()).getTime();
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

  let hours = Math.floor(delta / 3600) % 24;
  delta -= hours * 3600;

  let minutes = Math.floor(delta / 60) % 60;
  delta -= minutes * 60;

  let seconds = (Math.round(delta % 60 * 10) / 10).toFixed(1);
  return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.padStart(4, '0')}`;
}

function timeIntervalStringShort(final, initial) {
  initial = initial || 0;
  let delta = Math.abs(final - initial) / 1000;
  let hrs = delta / 3600;
  if (hrs > 1)
    return hrs.toFixed(1) + 'hr';
  let min = delta / 60;
  if (min > 1)
    return min.toFixed(1) + 'min';
  return delta.toFixed(1) + 's';
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
