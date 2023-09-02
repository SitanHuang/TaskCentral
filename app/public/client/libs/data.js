function data_init_default() {
  let def = {
    tasks: {},
    projects: {
      'default': project_new({
        color: '#5e5e5e',
        fontColor: 'white'
      })
    },
    settings: {},
    tags: {},
    filters: {}, // used by UI to store user-defined query filters
    comp: {
      rank: undefined,
      lastUpdated: undefined,
    }
  };
  back.data = Object.assign(def, back.data);
}
