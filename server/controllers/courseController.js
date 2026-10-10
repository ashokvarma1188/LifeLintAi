/*
 * The first-aid course. Lessons are the website's First-Aid Guide; this marks the final
 * quiz. Passing (8 of 10) issues a "First-Aid Aware" certificate that anyone can check.
 */
const User = require("../models/User");
const Certificate = require("../models/Certificate");
const { QUESTIONS, PASS_MARK } = require("../constants/firstAidQuiz");
const { issueFirstAid, publicView } = require("../utils/certificates");

/** The questions without their answers. */
const getQuiz = (req, res) => {
  res.json({
    passMark: PASS_MARK,
    questions: QUESTIONS.map(({ lesson, question, options }, index) => ({ index, lesson, question, options })),
  });
};

const getStatus = async (req, res) => {
  try {
    const certificate = await Certificate.findOne({ userId: req.userId, kind: "first_aid" }).lean();
    const course = req.user.firstAidCourse || {};
    res.json({
      passed: Boolean(course.passedAt),
      passedAt: course.passedAt || null,
      bestScore: course.bestScore ?? null,
      total: QUESTIONS.length,
      certificate: certificate ? publicView(certificate) : null,
    });
  } catch (err) {
    res.status(500).json({ message: "Something went wrong", error: err.message });
  }
};

const submitQuiz = async (req, res) => {
  try {
    const answers = req.body?.answers;
    if (!Array.isArray(answers) || answers.length !== QUESTIONS.length) {
      return res.status(400).json({ message: "Please answer every question." });
    }

    const results = QUESTIONS.map((q, i) => ({
      correct: Number(answers[i]) === q.answer,
      correctIndex: q.answer,
      explanation: q.explanation,
    }));
    const score = results.filter((r) => r.correct).length;
    const passed = score >= PASS_MARK;

    let certificate = null;
    if (passed) {
      const course = req.user.firstAidCourse || {};
      const user = await User.findByIdAndUpdate(
        req.userId,
        {
          "firstAidCourse.passedAt": course.passedAt || new Date(),
          "firstAidCourse.bestScore": Math.max(course.bestScore || 0, score),
          "firstAidCourse.total": QUESTIONS.length,
        },
        { returnDocument: "after" }
      );
      certificate = publicView(await issueFirstAid(user, score, QUESTIONS.length));
    }

    res.json({ score, total: QUESTIONS.length, passMark: PASS_MARK, passed, results, certificate });
  } catch (err) {
    res.status(500).json({ message: "Something went wrong", error: err.message });
  }
};

module.exports = { getQuiz, getStatus, submitQuiz };
