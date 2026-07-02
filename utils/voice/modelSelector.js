// Model selector: Picks which model/mode to use based on user preference
// (This is NOT the Express API router! That's in routes/voiceRoutes.js)
function pickModel(preference) {
  if (!preference) return 'mistral';
  const p = preference.toLowerCase();
  if (p.includes('gemma')) return 'gemma';
  if (p.includes('merge')) return 'merge';
  if (p.includes('fusion') || p.includes('pipeline') || p.includes('both')) return 'fusion';
  return 'mistral';
}

module.exports = { pickModel };
