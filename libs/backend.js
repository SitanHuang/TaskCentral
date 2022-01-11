function Backend() {
  let that = this;

  let fail = function (jqXHR, textStatus, errorThrown) {
    alert(`Sync failed - （${textStatus}: ${errorThrown}）`);
    window.location.href = 'about:blank';
  }

  this.data = null;
  this.dirty = false; // can be set by app
  this.uploading = false; // only set by back.update()

  this.mtime = null; // last retrieved mtime from server, in string

  // should only be called once
  this.init = function () {
    console.log('Retreiving data');
    let promise = new Promise(function (resolve, reject) {
      $.get('/storage/data?y=' + new Date().getTime()).fail(fail).done(
        function (data) {
          try {
            that.data = JSON.parse(data);
            that.update_mtime().catch(fail).then(
              function (mtime) {
                that.mtime = mtime;
                data_init_default();

                window.onfocus = throttle(() => {
                  that.update_mtime().catch(fail).then(
                    function (mtime) {
                      if (that.mtime != mtime) {
                        alert("Remote file changed since last sync! Reloading page for ya...");
              
                        window.onbeforeunload = null;
              
                        location.reload(); // force reload not needed
              
                        reject();
                        return;
                      }
                    }
                  );
                }, 1000);
              }
            );
          } catch (e) {
            fail(null, e.message, e);
          }
          resolve();
        })
    });
    return promise;
  };

  this.update_mtime = function () {
    let promise = new Promise(function (resolve, reject) {
      $.post('/mtime?y=' + new Date().getTime()).fail(fail).done(
        function (mtime) {
          console.debug('local mtime:server mtime = ' + that.mtime + ':' + mtime);
          resolve(mtime);
        }
      );
    });
    return promise;
  }

  this.update = function () {
    that.dirty = false;

    if (that.uploading) return; // only 1 upload at a time

    that.uploading = true;

    console.log('Sending data');

    let promise = new Promise(function (resolve, reject) {
      that.update_mtime().catch(fail).then(function (mtime) {
        if (that.mtime != mtime) {
          alert("Remote file changed since last sync! Reloading page for ya...");

          window.onbeforeunload = null;

          location.reload(); // force reload not needed

          reject();
          return;
        }

        let st = JSON.stringify(that.data);
        let blob = new Blob([st], { type: 'application/json' });
        let file = new File([ blob ], 'data.json');
        let fd = new FormData();
        fd.append('file', file, 'data.json');

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

          that.update_mtime().catch(fail).then(function (mtime2) {
            that.mtime = mtime2;
            that.uploading = false;
            resolve();
          });
        });
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

let back = new Backend();

// alert if window is closing while uploading
window.onbeforeunload = function (e) {
  if (back?.dirty || back?.uploading)
    return false;
};