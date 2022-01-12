let _settings_con;

function ui_menu_select_settings() {
  zip.configure({
    // our downloaded library is a reduced version
    // tha doesn't include webworker feature
    useWebWorkers: false
  });
}

async function ui_settings_export_ledg() {
  // - create a Data64URIWriter object to write the zipped data into a data URI
  // - create a ZipWriter object with the Data64URIWriter object as parameter
  let zipWriter = new zip.ZipWriter(new zip.Data64URIWriter("application/zip"));

  let queries = { queries: [] };

  let endDate = new Date(2100, 0, 1);

  for (let i = new Date(1970, 0, 1); i < endDate; ) {
    let from = i.getTime();
    i.setFullYear(i.getFullYear() + 1);

    queries.queries.push({
      from: from,
      to: i.getTime(),
      collect: ['tasks']
    });
  }

  let years = query_exec(queries);
  for (let tasks of years) {
    let year = new Date(tasks.from).getFullYear();
    let range = [tasks.from, tasks.to];

    let content = '';
    
    for (let task of tasks.tasks) {
      let periods = task_gen_working_periods(task, range);
      for (let period of periods) {
        let from = new Date(period.from);
        from = from.getFullYear() + '-' +
               (from.getMonth() + 1) + '-' +
               from.getDate() + ' ' +
               from.getHours() + ':' +
               from.getMinutes() + ':' +
               from.getSeconds();
        let to = new Date(period.to);
        to = to.getFullYear() + '-' +
               (to.getMonth() + 1) + '-' +
               to.getDate() + ' ' +
               to.getHours() + ':' +
               to.getMinutes() + ':' +
               to.getSeconds();
        let proj = (period.task.project || '').replace(/\s/g, '');
        content += `i ${from} Expense${proj ? '.' + proj : proj} ${period.task.name}\n`;
        content += `O ${to}\n\n`;
      }
    }

    if (!content)
      continue;
    
    let inputBlob = new Blob([content], { type: "text/plain" });
    // - create a BlobReader object to read the content of inputBlob
    // - add a new file in the zip and associate it to the BlobReader object
    await zipWriter.add(`export.${year}.ledg`, new zip.BlobReader(inputBlob));
  }

  // - close the ZipWriter object and get compressed data
  let dataURI = await zipWriter.close();
  console.log('dataURI', dataURI)
  let link = document.createElement('a');
  link.download = 'export.zip';
  link.href = dataURI;
  link.click();
}