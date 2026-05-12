// Returns current timestamp as ISO string in Honduras local time (UTC-6, no DST)
function nowHN(offsetMs = 0) {
  const str = new Date(Date.now() + offsetMs)
    .toLocaleString('sv', { timeZone: 'America/Tegucigalpa' })
  return str.replace(' ', 'T') + '-06:00'
}

module.exports = { nowHN };
