
let _admin_userlist_data_raw = null;
let _admin_userlist_data_uptime = null;
let _admin_userlist_total_users = null;
let _admin_userlist_signup_status = null;
let _admin_userlist_data = null;
let _admin_userlist_time = null;
let _admin_userlist_proctime = null;
let _admin_userlist_intervalid = null;
let _admin_userlist_timeoutid = null;
let _admin_userlist_selected = new Set();
let _admin_userlist_selected_detail = null;

$('#excludeUsersRegex').val(localStorage.admin_excludeUsersRegex || ''),
$('#includeUsersRegex').val(localStorage.admin_includeUsersRegex || ''),

$('#excludeUsersRegex, #includeUsersRegex').change(() => {
  localStorage.admin_includeUsersRegex = $('#includeUsersRegex').val();
  localStorage.admin_excludeUsersRegex = $('#excludeUsersRegex').val();
});

function _admin_userlist_preset_get() {
  return JSON.parse(localStorage.admin_userlist_presets || "{}");
}

function _admin_userlist_preset_set(preset) {
  localStorage.admin_userlist_presets = JSON.stringify(preset);
  _admin_userlist_preset_update_select();
}

function _admin_userlist_preset_update_select() {
  let presets = _admin_userlist_preset_get();

  let select = $('#userListPresets').html('<option> </option>');

  for (let name in presets) {
    select.append($(`<option/>`).text(name).val(name));
  }
}

function _admin_userlist_preset_del() {
  let name = $('#userListPresets').val();
  let presets = _admin_userlist_preset_get();
  delete presets[name];
  _admin_userlist_preset_set(presets);
}
function _admin_userlist_preset_load() {
  let name = $('#userListPresets').val();
  let presets = _admin_userlist_preset_get();
  let preset = presets[name];

  if (preset?.length != 2) return;

  $('#includeUsersRegex').val(preset[0]).change();
  $('#excludeUsersRegex').val(preset[1]).change();

  admin_userlist_start();
}
function _admin_userlist_preset_save() {
  let name = prompt('Name', $('#userListPresets').val());
  let presets = _admin_userlist_preset_get();
  presets[name] = [$('#includeUsersRegex').val(), $('#excludeUsersRegex').val()];
  _admin_userlist_preset_set(presets);
  $('#userListPresets').val(name);
}

function _admin_userlist_rerender() {
  let signupText = 'Last signup: unavailable. Signup limit: unavailable.';
  if (_admin_userlist_signup_status) {
    const signup = _admin_userlist_signup_status;
    const lastSignup = signup.last_signup > 0
      ? `${new Date(signup.last_signup).toLocaleString()} (${timeIntervalStringShort(timestamp(), signup.last_signup, Infinity)} ago)`
      : 'never';
    const limitStatus = signup.available
      ? 'available'
      : `limited for ${timeIntervalStringShort(signup.limited_until, timestamp(), Infinity)}`;
    signupText = `Last signup: ${lastSignup}. Signup limit: ${limitStatus} (${signup.signup_count}/${signup.signup_cap} used).`;
  }
  $('.live-userlist pre.status').text(`Updated ${timeIntervalStringShort(timestamp(), _admin_userlist_time)} ago. ${_admin_userlist_proctime}ms. Total users: ${_admin_userlist_total_users ?? '—'}. ${signupText} ${_admin_userlist_data_uptime?.trim()}`);

  if (!Array.isArray(_admin_userlist_data))
    return;

  let html = '';

  for (let userIndex = 0; userIndex < _admin_userlist_data.length; userIndex++) {
    const user = _admin_userlist_data[userIndex];
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
      <td><input type="checkbox" class="user-delete-checkbox" data-user-index="${userIndex}" ${user.is_root ? 'disabled title="Root users cannot be deleted"' : ''} ${_admin_userlist_selected.has(user.user) ? 'checked' : ''}>
      <td><button type="button" class="user-detail-button" data-user-index="${userIndex}">${sanitizeHTMLSafe(user.user)}</button> <a target="_blank" href="../client/?su=${encodeURIComponent(user.user)}">Client</a>
      <td>${sanitizeHTMLSafe(user.notes || '')}
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

  $('.user-delete-checkbox').change(function () {
    const selectedUser = _admin_userlist_data[$(this).data('user-index')];
    if (this.checked)
      _admin_userlist_selected.add(selectedUser.user);
    else
      _admin_userlist_selected.delete(selectedUser.user);
    _admin_userlist_update_select_all();
  });
  $('.user-detail-button').click(function () {
    admin_user_details_show($(this).data('user-index'));
  });
  _admin_userlist_update_select_all();

  if (_admin_userlist_selected_detail) {
    const selectedIndex = _admin_userlist_data.findIndex(user => user.user === _admin_userlist_selected_detail);
    if (selectedIndex >= 0)
      admin_user_details_show(selectedIndex);
  }

  resortTables();
}

function _admin_userlist_update_select_all() {
  const checkboxes = $('.user-delete-checkbox:not(:disabled)');
  $('#selectAllUsers').prop('checked', checkboxes.length > 0 && checkboxes.filter(':checked').length === checkboxes.length);
}

$('#selectAllUsers').change(function () {
  const checked = this.checked;
  $('.user-delete-checkbox:not(:disabled)').each(function () {
    this.checked = checked;
    const selectedUser = _admin_userlist_data[$(this).data('user-index')];
    if (checked)
      _admin_userlist_selected.add(selectedUser.user);
    else
      _admin_userlist_selected.delete(selectedUser.user);
  });
});

function admin_user_details_show(userIndex) {
  const user = _admin_userlist_data[userIndex];
  if (!user)
    return;

  _admin_userlist_selected_detail = user.user;
  const form = $('#editUserForm').show();
  form.find('[data-field="username"]').text(user.user);
  form.find('[data-field="create"]').text(new Date(user.create).toLocaleString());
  form.find('[data-field="lastVisited"]').text(new Date(user.data.last_visited).toLocaleString());
  form.find('[data-field="lastUpdated"]').text(new Date(user.data.last_updated).toLocaleString());
  form.find('[name="username"]').val(user.user);
  form.find('[name="email"]').val(user.email).prop('disabled', user.is_root);
  form.find('[name="status"]').val(user.status).prop('disabled', user.is_root);
  form.find('[name="notes"]').val(user.notes).prop('disabled', user.is_root);
  form.find('button[type="submit"]').prop('disabled', user.is_root);
}

$('#editUserForm').submit(function (event) {
  event.preventDefault();
  $.ajax({
    type: 'POST',
    url: 'updateUser',
    data: $(this).serialize(),
  }).fail(function (jqXHR, textStatus, errorThrown) {
    alert(`Update failed - (${textStatus}: ${errorThrown} - ${jqXHR.responseText})`);
  }).done(function () {
    alert('ok');
    _admin_userlist_fetch();
  });
});

function admin_delete_selected() {
  const usernames = $('.user-delete-checkbox:checked').map(function () {
    return _admin_userlist_data[$(this).data('user-index')].user;
  }).get();
  if (!usernames.length) {
    alert('Select at least one user.');
    return;
  }
  if (!confirm(`Permanently delete ${usernames.length} user(s) and their stored data?\n\n${usernames.join('\n')}`))
    return;

  $.ajax({
    type: 'POST',
    url: 'deleteUsers',
    contentType: 'application/json',
    data: JSON.stringify({ usernames }),
  }).fail(function (jqXHR, textStatus, errorThrown) {
    alert(`Delete failed - (${textStatus}: ${errorThrown} - ${jqXHR.responseText})`);
  }).done(function (result) {
    for (const deleted of result.deleted)
      _admin_userlist_selected.delete(deleted);
    if (result.failed.length)
      alert(result.failed.map(item => `${item.username}: ${item.reason}`).join('\n'));
    else
      alert(`Deleted ${result.deleted.length} user(s).`);
    _admin_userlist_fetch();
  });
}

function admin_raise_signup_cap() {
  const button = $('#raiseSignupCap').prop('disabled', true);
  $.post('./raiseSignupCap')
    .fail(function (jqXHR, textStatus, errorThrown) {
      alert(`Could not raise signup cap - (${textStatus}: ${errorThrown} - ${jqXHR.responseText})`);
    })
    .done(function (result) {
      if (_admin_userlist_signup_status) {
        _admin_userlist_signup_status.signup_cap = result.signup_cap;
        _admin_userlist_signup_status.available =
          _admin_userlist_signup_status.signup_count < result.signup_cap
          || timestamp() >= _admin_userlist_signup_status.limited_until;
      }
      _admin_userlist_rerender();
      alert(`Signup cap raised to ${result.signup_cap} until the server restarts.`);
    })
    .always(function () {
      button.prop('disabled', false);
    });
}

function _admin_userlist_fetch() {
  function beep() {
    const context = new (window.AudioContext || window.webkitAudioContext)();
    const gainNode = context.createGain();
    gainNode.gain.value = ($('#volumeSlider').val() / 100) || 0.0;
    const oscillator = context.createOscillator();

    oscillator.type = 'square';
    oscillator.frequency.setValueAtTime(parseFloat($('#pitchSlider').val()) || 440, context.currentTime);
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
      nonzero_last_visit: $('#nonzeroLastVisit').is(':checked'),
      nonzero_last_write: $('#nonzeroLastWrite').is(':checked'),
    },
    function (data) {
      data = JSON.parse(data)
      _admin_userlist_data_uptime = data.uptime;
      _admin_userlist_total_users = data.total_users;
      _admin_userlist_signup_status = data.signup_status;
      data = JSON.stringify(data.data);

      if (_admin_userlist_data_raw != data)
        beep();

      _admin_userlist_data = JSON.parse(_admin_userlist_data_raw = data);

      _admin_userlist_time = timestamp();
      _admin_userlist_proctime = timestamp() - _admin_userlist_proctime;

      _admin_userlist_rerender();

      _admin_userlist_timeoutid = setTimeout(_admin_userlist_fetch, ($('#freqSlider').val() * 1000) || 5000);
    }
  );
}

function admin_userlist_start() {
  if (_admin_userlist_intervalid)
    clearInterval(_admin_userlist_intervalid);
  if (_admin_userlist_timeoutid)
    clearTimeout(_admin_userlist_timeoutid);

  _admin_userlist_intervalid = setInterval(_admin_userlist_rerender, 593); // prime number
  _admin_userlist_fetch();
}

_admin_userlist_preset_update_select();
