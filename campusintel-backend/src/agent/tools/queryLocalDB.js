const supabase = require('../../config/supabase');

/**
 * Query local campus-specific intel for a company.
 * Checks cache first (college_company_intel), falls back to raw debriefs count.
 * Returns: { debrief_count, top_topics, source, confidence_level }
 */
async function execute(collegeId, companyId) {
  // 1. Check synthesized intel cache (< 7 days old)
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const { data: cached } = await supabase
    .from('college_company_intel')
    .select('*')
    .eq('college_id', collegeId)
    .eq('company_id', companyId)
    .gte('updated_at', sevenDaysAgo)
    .single();

  if (cached && cached.local_debrief_count > 0) {
    return {
      debrief_count: cached.local_debrief_count,
      top_topics: cached.top_topics || [],
      confidence_level: cached.confidence_level || 'LOW',
      selection_rate: cached.selection_rate,
      source: 'LOCAL_CACHE',
    };
  }

  // 2. Count raw debriefs directly
  const { count } = await supabase
    .from('interview_debriefs')
    .select('*', { count: 'exact', head: true })
    .eq('college_id', collegeId)
    .eq('company_id', companyId)
    .eq('is_verified', true);

  const debrief_count = count || 0;

  // 3. Get basic topic frequency if there are debriefs
  let top_topics = [];
  if (debrief_count > 0) {
    const { data: debriefs } = await supabase
      .from('interview_debriefs')
      .select('extracted_topics, outcome')
      .eq('college_id', collegeId)
      .eq('company_id', companyId)
      .eq('is_verified', true);

    const topicFrequency = {};
    debriefs?.forEach(d => {
      const topics = d.extracted_topics?.technical || [];
      topics.forEach(t => {
        topicFrequency[t] = (topicFrequency[t] || 0) + 1;
      });
    });

    top_topics = Object.entries(topicFrequency)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([topic, count]) => ({
        topic,
        frequency: parseFloat((count / debrief_count).toFixed(2)),
        priority: 1,
      }));
  }

  return {
    debrief_count,
    top_topics,
    confidence_level: debrief_count >= 10 ? 'HIGH' : debrief_count >= 5 ? 'MEDIUM' : 'LOW',
    selection_rate: null,
    source: 'LOCAL_RAW',
  };
}

module.exports = { execute };
