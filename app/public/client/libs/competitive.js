const COMP_ELO_RANGES = [
  { lower: 0.500, upper: 0.688, color: '#b32436', rank: "Novice I" },
  { lower: 0.688, upper: 0.737, color: '#b32436', rank: "Novice II" },
  { lower: 0.737, upper: 0.771, color: '#b32436', rank: "Novice III" },
  { lower: 0.771, upper: 0.798, color: '#b32436', rank: "Novice IV" },
  { lower: 0.798, upper: 0.821, color: '#c4921d', rank: "Organizer I" },
  { lower: 0.821, upper: 0.843, color: '#c4921d', rank: "Organizer II" },
  { lower: 0.843, upper: 0.862, color: '#c4921d', rank: "Organizer Elite" },
  { lower: 0.862, upper: 0.881, color: '#06b319', rank: "Specialist I" },
  { lower: 0.881, upper: 0.900, color: '#06b319', rank: "Specialist II" },
  { lower: 0.900, upper: 0.919, color: '#06b319', rank: "Specialist Elite" },
  { lower: 0.919, upper: 0.938, color: '#2454e5', rank: "Expert Tasker I" },
  { lower: 0.938, upper: 0.957, color: '#2454e5', rank: "Expert Tasker II" },
  { lower: 0.957, upper: 0.979, color: '#2454e5', rank: "Expert Tasker III" },
  { lower: 0.979, upper: 1.002, color: '#68149d', rank: "Elite Strategist I" },
  { lower: 1.002, upper: 1.029, color: '#68149d', rank: "Elite Strategist II" },
  { lower: 1.029, upper: 1.063, color: '#68149d', rank: "Elite Strategist III" },
  { lower: 1.063, upper: 1.118, color: '#68149d', rank: "Task Overlord" },
  { lower: 1.118, upper: 1.190, color: '#68149d', rank: "Task Champion" },
  { lower: 1.190, upper: 1.300, color: '#68149d', rank: "Task Paragon" }
].map((x, i) => { x.lower -= 0.15; x.upper -= 0.15; x.index = i; return x; });

const COMP_ELO_NAMES = COMP_ELO_RANGES.map(x => x.rank);

function comp_get_rank_obj(elo) {
  elo = elo || back.data.comp?.rank;

  if (!elo) return { color: '#373737', rank: "Unranked" };

  // Handle cases outside of the defined ELO ranges
  if (elo < COMP_ELO_RANGES[0].lower)
    return COMP_ELO_RANGES[0];
  if (elo >= COMP_ELO_RANGES[COMP_ELO_RANGES.length - 1].upper)
    return COMP_ELO_RANGES[COMP_ELO_RANGES.length - 1];

  // Find the corresponding rank
  for (const range of COMP_ELO_RANGES) {
    if (elo >= range.lower && elo < range.upper) {
      return range;
    }
  }
}

/**
 * Returns whether rank should be recalculated.
 */
function comp_check_recalc() {
  // return !(timestamp() - back.data.comp?.lastUpdated < 5.616e+8); // 6.5 days

  return closestPreviousMonday(back.data.comp?.lastUpdated || -1) < closestPreviousMonday();
}

/**
  * Performs complete recalculation of user skill group. Sets back dirty.
  *
  * @params today - today's timestamp
  * @params m  - positive value for rate of rank decay for historical data
  * @params p  - number of [month, week, day] that counts as one period
  * @params a  - period offset for rank decay (no effect for mt=2)
  * @params N  - number of periods
  * @params nM - start date with nearestMonday?
  * @params mW - minimum work per period
  * @params t  - minimum weights for elo to be considered
  *              ex. recommend >1.4 weight for p=daily (about 20 days)
  *
  * @params mt - method: either 1 or 2 (1/x or exp decay)
  *
  * @params dry- dry run?
  *
  * @returns error message (undefined if successful)
  */
function comp_rank_calc({
  today = timestamp(),
  m     = 0.95,
  p     = [0, 0, 1], // daily
  a     = 2,
  N     = 40,
  mW    = 3.0,
  t     = 4.0,
  nM    = true,
  dry   = false,

  mt    = 2,

  _debug= false,
} = {}) {
  const { weights, elo } = _comp_rank_calc_weights({ today, m, p, N, nM, mW, a, mt, _debug });

  console.log("Elo=", elo, "Weights=", weights, "Rank=", comp_get_rank_obj(elo));

  if (weights < t) {
    if (!dry) {
      back.data.comp.rank = undefined;
      back.data.comp.lastUpdated = timestamp();

      back.set_dirty();
    }
    return "System does not feel confident to produce a rank from your data. " +
           "Keep using TaskCentral and come back in a week or two.";
  }

  if (elo < 0.1 || elo > 1.8)
    return "Something doesn't seem right.";

  if (dry) return;

  back.data.comp.rank = elo;
  back.data.comp.lastUpdated = timestamp();

  back.set_dirty();
}

function _comp_rank_calc_weights({ today, m, p, N, nM, mW, a, mt, _debug }) {
  const query = {
    queries: [{
      status: [],
      hidden: null,
      due: null,
      projects: [],
      collect: ['tasks'],

      from: addDateByMonthWeekDay(new Date(today), p.map(x => -x * N)).getTime(),
      to: today
    }]
  };

  ui_metrics_inject_tasks(query);

  let nearestMonday = new Date(midnight(today));

  if (nM)
    nearestMonday = closestPreviousMonday(nearestMonday);

  let data = [];
  let sums = 0;
  let weights = 0;

  let debug = "";

  for (let i = 1;i <= N; i++) {
    let startDate = addDateByMonthWeekDay(nearestMonday, p.map(x => -x * i));
    let endDate = addDateByMonthWeekDay(nearestMonday, p.map(x => -x * (i - 1)));

    let weight = mt == 2 ? Math.pow(m, i) : Math.pow(i + a, -m);
    let score = Number(METRICS_FUNCTIONS["Rating"][1](startDate, endDate)) || 0;
    let work = Number(METRICS_FUNCTIONS["Work All (All)"][1](startDate, endDate)) || 0;

    if (score <= 0.1)
      weight *= 0.1;
    if (work <= mW)
      weight *= 0.1;

    if (_debug && score > 0.1 && work > mW)
      debug += score + '\n';

    sums += score * weight;
    weights += weight;
    data.push([score, weight, startDate, endDate]);
  }

  if (_debug)
    console.log(debug);

  return {
    data,
    sums,
    weights,

    elo: sums / weights,
  };
}
