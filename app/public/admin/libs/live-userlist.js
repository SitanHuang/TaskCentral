
let _admin_userlist_data_raw = null;
let _admin_userlist_data = null;
let _admin_userlist_time = null;
let _admin_userlist_proctime = null;
let _admin_userlist_intervalid = null;

$('#excludeUsersRegex').val(localStorage.admin_excludeUsersRegex || ''),
$('#includeUsersRegex').val(localStorage.admin_includeUsersRegex || ''),

$('#excludeUsersRegex, #includeUsersRegex').change(() => {
  localStorage.admin_excludeUsersRegex = $('#excludeUsersRegex').val();
  localStorage.admin_includeUsersRegex = $('#includeUsersRegex').val();
});

function _admin_userlist_rerender() {
  $('.live-userlist pre.status').text(`Updated ${timeIntervalStringShort(timestamp(), _admin_userlist_time)} ago. ${_admin_userlist_proctime}ms`);

  if (!Array.isArray(_admin_userlist_data))
    return;

  let html = '';

  for (const user of _admin_userlist_data) {
    const data = user.data;

    let started = '<td data-sort="0">';

    if (data.started) {
      const start_stamp = task_get_latest_start_stamp(data.started);
      started = `
        <td data-sort="${start_stamp}">
          ${sanitizeHTMLSafe(data.started.name)} -
          ${sanitizeHTMLSafe(data.started.project)}
          (${timeIntervalString(timestamp(), start_stamp)})
      `;
    }

    const percUsed = data.size / data.quota * 100;

    const sg_label = comp_get_rank_obj(data.comp?.rank || false).rank;

    html += `
    <tr>
      <td><a target="_blank" href="../client/?su=${sanitizeHTMLSafe(user.user)}">${sanitizeHTMLSafe(user.user)}</a>
      <td data-sort="${data.last_visited}">${new Date(data.last_visited).toLocaleString()} (${timeIntervalStringShort(timestamp(), data.last_visited, Infinity)} ago)
      <td data-sort="${data.last_updated}">${new Date(data.last_updated).toLocaleString()} (${timeIntervalStringShort(timestamp(), data.last_updated, Infinity)} ago)
      ${started}
      <td>${sg_label} - ${data.comp?.lastUpdated ? timeIntervalStringShort(timestamp(), data.comp.lastUpdated, 3) : ''}
      <td data-sort="${data.comp?.rank || -1}">${data.comp?.rank ? Math.round(data.comp.rank * 10000) / 10000 : ''}
      <td data-sort="${data.size}">${humanFileSize(data.size)} / ${humanFileSize(data.quota)}
      <td data-sort="${percUsed}">${Math.round(10000 * percUsed) / 10000} %
    `;
  }

  $('.live-userlist table tbody').html(html);

  resortTables();
}

function _admin_userlist_fetch() {
  function beep() {
    const context = new (window.AudioContext || window.webkitAudioContext)();
    const gainNode = context.createGain();
    gainNode.gain.value = ($('#volumeSlider').val() / 100) || 0.8;
    const oscillator = context.createOscillator();

    oscillator.type = 'square';
    oscillator.frequency.setValueAtTime(440, context.currentTime); // 440 Hz frequency (A4 note)
    oscillator.connect(gainNode).connect(context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime + 0.2); // stops after 200ms
  }

  _admin_userlist_data = null;

  _admin_userlist_proctime = timestamp();
  $.post(
    "./userStats",
    {
      exclude_users: $('#excludeUsersRegex').val(),
      include_users: $('#includeUsersRegex').val(),
    },
    function (data) {
    if (_admin_userlist_data_raw != data)
      beep();

    _admin_userlist_data = JSON.parse(_admin_userlist_data_raw = data);

    _admin_userlist_time = timestamp();
    _admin_userlist_proctime = timestamp() - _admin_userlist_proctime;

    _admin_userlist_rerender();

    setTimeout(_admin_userlist_fetch, ($('#freqSlider').val() * 1000) || 5000);
  });
}

function admin_userlist_start() {
  if (_admin_userlist_intervalid)
    clearInterval(_admin_userlist_intervalid);

  _admin_userlist_intervalid = setInterval(_admin_userlist_rerender, 593); // prime number

  _admin_userlist_fetch();
}
