/** Converts a timespan in the form of a string to the equivalent number of milliseconds
 * @param   {string} str       String containing units of time (eg. 1y, 2 days, 1min, etc.)
 * @param   {bool  } take_sum  If true, returns the sum of duplicated units in str
 * @returns {number} Timespan in Milliseconds
 *
 * https://stackoverflow.com/a/77849434
 */
function parse_smart_duration(str, take_sum = true) {
  const units = {
    yr: { re: /(\d+|\d*\.\d+)\s*(Y)/i, s: 1000 * 60 * 60 * 24 * 365 }, // Case insensitive "Y"
    mo: { re: /(\d+|\d*\.\d+)\s*(M|[Mm][Oo])/, s: 1000 * 60 * 60 * 24 * 30 }, // Case insensitive "mo" or sensitive "M"
    wk: { re: /(\d+|\d*\.\d+)\s*(W)/i, s: 1000 * 60 * 60 * 24 * 7 }, // Case insensitive "W"
    dy: { re: /(\d+|\d*\.\d+)\s*(D)/i, s: 1000 * 60 * 60 * 24 }, // Case insensitive "D"
    hr: { re: /(\d+|\d*\.\d+)\s*(h)/i, s: 1000 * 60 * 60 }, // Case insensitive "h"
    mn: { re: /(\d+|\d*\.\d+)\s*(m(?!s|o)|[Mm][Ii]?[Nn])/, s: 1000 * 60 }, // Case insensitive "min"/"mn" or sensitive "m" (if not followed by "s" or "o")
    sc: { re: /(\d+|\d*\.\d+)\s*(s)/i, s: 1000 }, // Case insensitive "s"
    ms: { re: /(\d+|\d*\.\d+)\s*(ms|mil)/i, s: 1 }, // Case insensitive "ms"/"mil"
  };

  /** Convert from ISO format
   *
   * The follow special cases are also parseable as an ISO format:
   *      123 08:12   -> 123 days 8 hours 12 minutes
   *      08:12:32    -> 8 hours 12 minutes 32 seconds
   *      2022/01/23  -> 2022 years 1 month 23 days
   *      12:32:09.09 -> 12 hours 32 minutes 9 seconds 90 milliseconds
   */
  str = str.replaceAll(/(?<!:)(?:(?<yr>\d+)[/-](?<mo>\d+)[/-])?(?<dy>(?<=[/-])\d+|\d+(?=[T ]))?[T ]?(?:(?<hr>\d+):(?<mn>\d+)(?:[:](?<sc>\d+\.?\d*))?)?(?!:)/g, function (...args) {
    const units = args.lastItem;

    let out = [];
    for (let unit in units) {
      if (!units[unit]) continue;

      out.push(`${units[unit]}${unit}`);
    }
    if (out.length == 0) return args[0];
    return out.join(' ');
  })

  /** Convert from H:m:s format
   *
   * There are 3 cases: hh:mm, hh:mm:ss, and the generic case,
   * where the generic case accepts between 4 and 7 colon-delimited sections, with the rightmost
   * is always seconds, and each section moving left increases to the next larger time unit
   */
  if (str.match(/\d+:\d+/)) {
    let time = str.split(":")
    switch (time.length) {
      case 2:
        str = `${time[0]}hr ${time[1]}min`;
        break;
      case 3:
        str = `${time[0]}hr ${time[1]}min ${time[2] ?? 0}sec`;
        break;
      default:
        let types = Object.keys(units).reverse().slice(1).filter(u => u != "wk"); // Weeks are not used in this time format
        str = time.reverse().map((t, i) => `${t}${types[i]}`).join(' ');
        break;
    }
  }

  /** Convert from time string to milliseconds
   *
   * Given the format of <numeric value> <time unit>, each value-unit pair is converted
   * to equiivalent milliseconds, before taking the sum of all converted pairs
   */
  return Object.values(units).reduce(function (sum, unit) {
    const parse = (m) => m?.[1] * unit.s || 0;
    return sum + (!take_sum ? parse(str.match(unit.re))
      : Array.from(str.matchAll?.(RegExp(unit.re, unit.re.flags + "g"))).reduce((ms, m) => ms + parse(m), 0) || 0);
  }, 0);
}
