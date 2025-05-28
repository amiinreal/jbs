import pool from '../database.js';

// Helper function to check job ownership
const checkJobOwnership = async (jobId, userId) => {
  const { rows } = await pool.query('SELECT user_id FROM job_listings WHERE id = $1', [jobId]);
  if (rows.length === 0) {
    return { owned: false, error: 'Job not found', status: 404 };
  }
  if (rows[0].user_id !== userId) {
    return { owned: false, error: 'User not authorized to modify questions for this job', status: 403 };
  }
  return { owned: true };
};

// Helper function to check question ownership (via job)
const checkQuestionOwnership = async (questionId, userId) => {
  const { rows } = await pool.query(
    `SELECT jl.user_id 
     FROM job_custom_questions jcq
     JOIN job_listings jl ON jcq.job_id = jl.id
     WHERE jcq.id = $1`,
    [questionId]
  );
  if (rows.length === 0) {
    return { owned: false, error: 'Question not found', status: 404 };
  }
  if (rows[0].user_id !== userId) {
    return { owned: false, error: 'User not authorized to modify this question', status: 403 };
  }
  return { owned: true };
};

// Create a new custom question for a job
export const createQuestion = async (req, res) => {
  const { jobId } = req.params; // Get jobId from route parameter
  const { question_text, question_type, options, is_required, sort_order } = req.body;
  const userId = req.user.id;

  try {
    // Validate job ownership
    const ownershipCheck = await checkJobOwnership(jobId, userId);
    if (!ownershipCheck.owned) {
      return res.status(ownershipCheck.status).json({ success: false, error: ownershipCheck.error });
    }

    // Basic validation for question_type and options
    const validQuestionTypes = ['text', 'textarea', 'select', 'radio', 'checkbox'];
    if (!validQuestionTypes.includes(question_type)) {
      return res.status(400).json({ success: false, error: 'Invalid question type.' });
    }
    if (['select', 'radio', 'checkbox'].includes(question_type) && (!options || options.length === 0)) {
      return res.status(400).json({ success: false, error: 'Options are required for select, radio, or checkbox types.' });
    }
    
    let optionsJson = null;
    if (options && ['select', 'radio', 'checkbox'].includes(question_type)) {
        try {
            optionsJson = JSON.stringify(options);
        } catch (e) {
            return res.status(400).json({ success: false, error: 'Invalid options format. Should be an array of strings.' });
        }
    }


    const { rows } = await pool.query(
      `INSERT INTO job_custom_questions (job_id, question_text, question_type, options, is_required, sort_order)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [jobId, question_text, question_type, optionsJson, is_required || false, sort_order || 0]
    );
    res.status(201).json({ success: true, data: rows[0] });
  } catch (err) {
    console.error('Error creating question:', err);
    res.status(500).json({ success: false, error: 'Failed to create question: ' + err.message });
  }
};

// Get all custom questions for a job
export const getQuestionsForJob = async (req, res) => {
  const { jobId } = req.params;
  // No ownership check needed for GETting questions, as they might be shown on public job application forms
  // However, ensure the job itself is valid/published if needed, or rely on job fetching logic.
  // For simplicity now, just fetch by jobId.
  try {
    const { rows } = await pool.query(
      'SELECT * FROM job_custom_questions WHERE job_id = $1 ORDER BY sort_order ASC, created_at ASC',
      [jobId]
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('Error fetching questions for job:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch questions for job: ' + err.message });
  }
};

// Update a custom question
export const updateQuestion = async (req, res) => {
  const { questionId } = req.params;
  const { question_text, question_type, options, is_required, sort_order } = req.body;
  const userId = req.user.id;

  try {
    // Validate question ownership
    const ownershipCheck = await checkQuestionOwnership(questionId, userId);
    if (!ownershipCheck.owned) {
      return res.status(ownershipCheck.status).json({ success: false, error: ownershipCheck.error });
    }

    // Build SET clause dynamically
    const setClauses = [];
    const values = [];
    let paramCount = 1;

    if (question_text !== undefined) {
      setClauses.push(`question_text = $${paramCount++}`);
      values.push(question_text);
    }
    if (question_type !== undefined) {
      const validQuestionTypes = ['text', 'textarea', 'select', 'radio', 'checkbox'];
      if (!validQuestionTypes.includes(question_type)) {
        return res.status(400).json({ success: false, error: 'Invalid question type.' });
      }
      setClauses.push(`question_type = $${paramCount++}`);
      values.push(question_type);
    }
    if (options !== undefined) { // options can be null to clear them
        if (options === null || (Array.isArray(options) && options.length > 0)) {
             try {
                setClauses.push(`options = $${paramCount++}`);
                values.push(options ? JSON.stringify(options) : null);
            } catch (e) {
                 return res.status(400).json({ success: false, error: 'Invalid options format. Should be an array of strings or null.' });
            }
        } else if (Array.isArray(options) && options.length === 0 && ['select', 'radio', 'checkbox'].includes(req.body.question_type || (await pool.query('SELECT question_type from job_custom_questions WHERE id = $1', [questionId])).rows[0].question_type) ) {
            // If options are empty for a type that requires them, this is an issue - or allow it and let frontend validate.
            // For now, allow setting empty array as JSON "[]"
            setClauses.push(`options = $${paramCount++}`);
            values.push(JSON.stringify([]));
        }
    }
    if (is_required !== undefined) {
      setClauses.push(`is_required = $${paramCount++}`);
      values.push(is_required);
    }
    if (sort_order !== undefined) {
      setClauses.push(`sort_order = $${paramCount++}`);
      values.push(sort_order);
    }

    if (setClauses.length === 0) {
      return res.status(400).json({ success: false, error: 'No fields provided for update.' });
    }

    setClauses.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(questionId);

    const query = `UPDATE job_custom_questions SET ${setClauses.join(', ')} WHERE id = $${paramCount} RETURNING *`;
    
    const { rows } = await pool.query(query, values);
    if (rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Question not found or update failed.' });
    }
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    console.error('Error updating question:', err);
    res.status(500).json({ success: false, error: 'Failed to update question: ' + err.message });
  }
};

// Delete a custom question
export const deleteQuestion = async (req, res) => {
  const { questionId } = req.params;
  const userId = req.user.id;

  try {
    // Validate question ownership
    const ownershipCheck = await checkQuestionOwnership(questionId, userId);
    if (!ownershipCheck.owned) {
      return res.status(ownershipCheck.status).json({ success: false, error: ownershipCheck.error });
    }

    const { rowCount } = await pool.query('DELETE FROM job_custom_questions WHERE id = $1', [questionId]);
    if (rowCount === 0) {
      return res.status(404).json({ success: false, error: 'Question not found.' });
    }
    res.json({ success: true, message: 'Question deleted successfully.' });
  } catch (err) {
    console.error('Error deleting question:', err);
    res.status(500).json({ success: false, error: 'Failed to delete question: ' + err.message });
  }
};

[end of backend/controllers/jobCustomQuestionsController.js]
