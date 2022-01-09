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
  let delta = Math.abs(final - initial) / 1000;
  
  let hours = Math.floor(delta / 3600) % 24;
  delta -= hours * 3600;
  
  let minutes = Math.floor(delta / 60) % 60;
  delta -= minutes * 60;

  let seconds = (Math.round(delta % 60 * 10) / 10).toFixed(1);
  return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.padStart(4, '0')}`;
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