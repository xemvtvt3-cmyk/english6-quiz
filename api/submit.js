const { createClient } = require('@supabase/supabase-js');
const answerKey = [{"question_number":1,"skill":"Vocabulary","difficulty":"Understanding","type":"mc","answer":0},{"question_number":2,"skill":"Vocabulary","difficulty":"Understanding","type":"mc","answer":1},{"question_number":3,"skill":"Vocabulary","difficulty":"Understanding","type":"mc","answer":2},{"question_number":4,"skill":"Vocabulary","difficulty":"Application","type":"mc","answer":0},{"question_number":5,"skill":"Vocabulary","difficulty":"Application","type":"mc","answer":1},{"question_number":6,"skill":"Vocabulary","difficulty":"Application","type":"mc","answer":0},{"question_number":7,"skill":"Vocabulary","difficulty":"Application","type":"fill","answer":["bathroom","bath room"]},{"question_number":8,"skill":"Vocabulary","difficulty":"Application","type":"mc","answer":1},{"question_number":9,"skill":"Vocabulary","difficulty":"Advanced","type":"mc","answer":0},{"question_number":10,"skill":"Vocabulary","difficulty":"Advanced","type":"fill","answer":["confident","outgoing","sociable","friendly"]},{"question_number":11,"skill":"Grammar","difficulty":"Understanding","type":"mc","answer":1},{"question_number":12,"skill":"Grammar","difficulty":"Understanding","type":"mc","answer":2},{"question_number":13,"skill":"Grammar","difficulty":"Understanding","type":"mc","answer":0},{"question_number":14,"skill":"Grammar","difficulty":"Application","type":"mc","answer":1},{"question_number":15,"skill":"Grammar","difficulty":"Application","type":"mc","answer":2},{"question_number":16,"skill":"Grammar","difficulty":"Application","type":"mc","answer":2},{"question_number":17,"skill":"Grammar","difficulty":"Application","type":"fill","answer":["between"]},{"question_number":18,"skill":"Grammar","difficulty":"Application","type":"mc","answer":2},{"question_number":19,"skill":"Grammar","difficulty":"Advanced","type":"fill","answer":["aren't playing / are doing","are not playing / are doing","aren't playing/are doing","are not playing/are doing"]},{"question_number":20,"skill":"Grammar","difficulty":"Advanced","type":"fill","answer":["parents'"]},{"question_number":21,"skill":"Reading","difficulty":"Understanding","type":"mc","answer":1},{"question_number":22,"skill":"Reading","difficulty":"Understanding","type":"mc","answer":2},{"question_number":23,"skill":"Reading","difficulty":"Understanding","type":"mc","answer":1},{"question_number":24,"skill":"Reading","difficulty":"Application","type":"mc","answer":2},{"question_number":25,"skill":"Reading","difficulty":"Application","type":"mc","answer":1},{"question_number":26,"skill":"Reading","difficulty":"Application","type":"mc","answer":2},{"question_number":27,"skill":"Reading","difficulty":"Application","type":"fill","answer":["at the desk","at desk","on the desk"]},{"question_number":28,"skill":"Reading","difficulty":"Application","type":"mc","answer":1},{"question_number":29,"skill":"Reading","difficulty":"Advanced","type":"mc","answer":1},{"question_number":30,"skill":"Reading","difficulty":"Advanced","type":"mc","answer":2},{"question_number":31,"skill":"Writing","difficulty":"Understanding","type":"order","answer":"I usually do my homework after dinner."},{"question_number":32,"skill":"Writing","difficulty":"Understanding","type":"order","answer":"The cat is under the chair."},{"question_number":33,"skill":"Writing","difficulty":"Understanding","type":"fill","answer":["is"]},{"question_number":34,"skill":"Writing","difficulty":"Application","type":"order","answer":"We are reading in the library at the moment."},{"question_number":35,"skill":"Writing","difficulty":"Application","type":"fill","answer":["Lan's","Lan’s"]},{"question_number":36,"skill":"Writing","difficulty":"Application","type":"fill","answer":["are singing"]},{"question_number":37,"skill":"Writing","difficulty":"Application","type":"short","answer":null},{"question_number":38,"skill":"Writing","difficulty":"Application","type":"short","answer":null},{"question_number":39,"skill":"Writing","difficulty":"Advanced","type":"short","answer":null},{"question_number":40,"skill":"Writing","difficulty":"Advanced","type":"short","answer":null}];

function normalize(value) {
  return String(value ?? '').toLowerCase().trim()
    .replace(/[’‘]/g, "'").replace(/[.!?]+$/g, '').replace(/\s+/g, ' ');
}
function scoreOne(q, value) {
  const answer = String(value ?? '').trim();
  if (q.type === 'short') return null; // Requires teacher review.
  if (!answer) return false;
  if (q.type === 'mc') return Number(answer) === q.answer;
  const accepted = Array.isArray(q.answer) ? q.answer : [q.answer];
  return accepted.some(a => normalize(answer) === normalize(a));
}
function cleanText(value, max) {
  return String(value ?? '').trim().slice(0, max);
}

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    return res.status(500).json({ error: 'Server is not configured. Ask the teacher to check Vercel environment variables.' });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    const name = cleanText(body.name, 120);
    const klass = cleanText(body.klass, 40);
    const answers = body.answers;
    if (!name || !klass || !answers || typeof answers !== 'object' || Array.isArray(answers)) {
      return res.status(400).json({ error: 'Please provide your full name, class, and answers.' });
    }
    if (Object.keys(answers).length > 40) {
      return res.status(400).json({ error: 'Invalid answer payload.' });
    }

    const scored = answerKey.map(q => ({ ...q, answer_text: cleanText(answers[q.question_number - 1], 2000), correct: scoreOne(q, answers[q.question_number - 1]) }));
    const objectiveRows = scored.filter(q => q.correct !== null);
    const objectiveCorrect = objectiveRows.filter(q => q.correct).length;
    const objectiveTotal = objectiveRows.length;
    const writingPending = scored.filter(q => q.correct === null).length;
    const skill = {};
    for (const q of scored) {
      if (!skill[q.skill]) skill[q.skill] = { got: 0, max: 0 };
      if (q.correct !== null) {
        skill[q.skill].max += 1;
        if (q.correct) skill[q.skill].got += 1;
      }
    }

    const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data: attempt, error: attemptError } = await supabase.from('quiz_attempts').insert({
      student_name: name,
      student_class: klass,
      quiz_code: 'english6-units1-3',
      objective_correct: objectiveCorrect,
      objective_total: objectiveTotal,
      writing_pending: writingPending,
      teacher_review_status: writingPending ? 'pending' : 'reviewed'
    }).select('id, submitted_at').single();
    if (attemptError) throw attemptError;

    const answerRows = scored.map(q => ({
      attempt_id: attempt.id,
      question_number: q.question_number,
      skill: q.skill,
      difficulty: q.difficulty,
      answer_text: q.answer_text,
      is_objectively_correct: q.correct
    }));
    const { error: answersError } = await supabase.from('quiz_answers').insert(answerRows);
    if (answersError) {
      // Do not reveal database details to the browser. The teacher can locate the attempt by ID.
      console.error('Could not save quiz answers for attempt', attempt.id, answersError.message);
      return res.status(500).json({ error: 'The attempt was created but some answer details could not be saved. Please tell your teacher and do not resubmit yet.', attemptId: attempt.id });
    }

    return res.status(200).json({
      ok: true,
      id: attempt.id,
      submittedAt: attempt.submitted_at,
      name,
      klass,
      objective: objectiveCorrect,
      autoMax: objectiveTotal,
      pending: writingPending,
      skill,
      status: writingPending ? 'Needs writing review' : 'Auto-marked'
    });
  } catch (error) {
    console.error('Quiz submission failed:', error.message || error);
    return res.status(500).json({ error: 'We could not save your submission. Please try again or tell your teacher.' });
  }
};
