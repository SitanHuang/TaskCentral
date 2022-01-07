function Backend() {
  let that = this;

  let fail = function (jqXHR, textStatus, errorThrown) {
    alert(`与服务器同步失败 （${textStatus}: ${errorThrown}）`);
    window.location.href = 'about:blank';
  }

  this.data = null;
  this.dirty = false; // can be set by app
  this.uploading = false; // only set by back.update()

  this.init = function () {
    console.log('Retreiving data');
    var promise = new Promise(function (resolve, reject) {
      $.get('/storage/data?y=' + new Date().getTime()).fail(fail).done(
        function (data) {
          try {
            that.data = JSON.parse(data);
            data_init_default();
          } catch (e) {
            fail(null, e.message, e);
          }
          resolve();
        })
    });
    return promise;
  };

  this.update = function () {
    that.dirty = false;

    if (that.uploading) return; // only 1 upload at a time

    that.uploading = true;

    console.log('Sending data');
    var st = JSON.stringify(that.data);
    var blob = new Blob([st], { type: 'application/json' });
    var file = new File([ blob ], 'data.json');
    var fd = new FormData();
    fd.append('file', file, 'data.json');

    var promise = new Promise(function (resolve, reject) {
      $.ajax({
          type: "POST",
          url: '/overwrite',
          data: fd,
          processData: false,
          contentType: false,
      }).fail(fail).done(function () {
        // that.init().then(function () {
        //   that.uploading = false;
        //   resolve();
        // });
        that.uploading = false;
        resolve();
      });

    });

    return promise;
  };

  this.monitorID = -1;
  this.start_monitor = function() {
    that.monitorID = setInterval(function() {
      ui_update_sync_status();

      if (that.dirty)
        that.update(); // update itself checks for 1 update at a time
    }, 1000); // check for sync every interval
    console.log('Started monitoring service.');
  };

  this.set_dirty = function() {
    that.dirty = true;
    ui_update_sync_status();
  }
}

var back = new Backend();

// alert if window is closing while uploading
window.onbeforeunload = function (e) {
  if (back?.dirty || back?.uploading)
    return false;
};