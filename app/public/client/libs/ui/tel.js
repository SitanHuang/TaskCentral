(function() {
  if (back.su) {
    console.log('SU mode. Tel disabled.');
    return;
  }
  var tr = TinyTel();
  setInterval(function () {
    try {
      var out = tr.flush();

      if (!out.json.length || typeof back?.data?._tele !== 'object') return;

      back.data._tele.logs = back.data._tele.logs || '';

      let logs = back.data._tele.logs.split("\n");

      logs.push(...out.lines);

      const MAX_COUNT = 25;

      logs.splice(0, Math.max(0, logs.length - MAX_COUNT));

      back.data._tele.logs = logs.filter(x => x.trim().length).join("\n");
    } catch (e) {
      console.error(e);
    }
  }, 5000);
})();