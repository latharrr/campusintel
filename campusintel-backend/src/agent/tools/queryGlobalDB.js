const supabase = require('../../config/supabase');

/**
 * Query global intel — aggregated across ALL colleges except the student's.
 * Used as fallback when local data is insufficient.
 */
async function execute(companyId, excludeCollegeId) {
  const { count } = await supabase
    .from('interview_debriefs')
    .select('*', { count: 'exact', head: true })
    .eq('company_id', companyId)
    .neq('college_id', excludeCollegeId)
    .eq('is_verified', true);

  const global_count = count || 0;

  let top_topics = [];
  if (global_count > 0) {
    const { data: debriefs } = await supabase
      .from('interview_debriefs')
      .select('extracted_topics')
      .eq('company_id', companyId)
      .neq('college_id', excludeCollegeId)
      .eq('is_verified', true)
      .limit(50);

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
        frequency: parseFloat((count / global_count).toFixed(2)),
        priority: 1,
      }));
  }

  return {
    debrief_count: global_count,
    top_topics,
    source: 'GLOBAL_POOL',
    confidence_level: global_count >= 10 ? 'MEDIUM' : 'LOW',
  };
}

module.exports = { execute };
