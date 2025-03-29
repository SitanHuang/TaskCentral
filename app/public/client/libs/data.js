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
    trackers: [],
    comp: {
      rank: undefined,
      lastUpdated: undefined,
    },
    _tele: {}, // can be set to false to turn off
    projectPriorityCoeffRules: [],
  };
  back.data = Object.assign(def, back.data);
}
