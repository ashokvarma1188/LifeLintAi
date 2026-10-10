import { useEffect, useMemo, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  ArrowLeft, GraduationCap, BookOpen, Check, ChevronDown, CircleAlert, Phone, Trophy, RotateCcw, FileBadge, ArrowRight, X, ExternalLink,
} from "lucide-react";
import AppNavbar from "./AppNavbar";
import FIRST_AID_GUIDES from "../data/firstAidGuide";
import { getQuiz, getCourseStatus, submitQuiz } from "../services/course";
import { getErrorMessage } from "../services/api";
import { useLang } from "../i18n/context";
import "./Dashboard.css";
import "./portal.css";
import "./FirstAidCourse.css";

const LESSON_IDS = ["cpr", "choking", "bleeding", "burns", "heart-attack", "stroke", "seizure", "snake-bite"];
const LESSONS = LESSON_IDS.map((id) => FIRST_AID_GUIDES.find((g) => g.id === id)).filter(Boolean);
const READ_KEY = "ll-course-read";

// Which lessons are done is a per-device convenience, so localStorage is fine (and may be blocked).
const loadRead = () => {
  try {
    return JSON.parse(localStorage.getItem(READ_KEY) || "[]");
  } catch {
    return [];
  }
};
const saveRead = (ids) => {
  try {
    localStorage.setItem(READ_KEY, JSON.stringify(ids));
  } catch {
    /* storage blocked — progress just isn't remembered */
  }
};

/** Eight short lessons, a 10-question quiz marked on the server, and a certificate for passing. */
function FirstAidCourse() {
  const navigate = useNavigate();
  const { t, lang } = useLang();
  const [status, setStatus] = useState(null);
  const [read, setRead] = useState(loadRead);
  const [openLesson, setOpenLesson] = useState(null);
  const [mode, setMode] = useState("lessons"); // lessons | quiz | result
  const [quiz, setQuiz] = useState(null);
  const [answers, setAnswers] = useState([]);
  const [current, setCurrent] = useState(0);
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const [certBusy, setCertBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    getCourseStatus().then(setStatus).catch(() => setStatus(null));
  }, []);

  const markRead = (id) => {
    const next = read.includes(id) ? read : [...read, id];
    setRead(next);
    saveRead(next);
    const index = LESSONS.findIndex((l) => l.id === id);
    setOpenLesson(LESSONS[index + 1]?.id || null);
  };

  const startQuiz = async () => {
    setBusy(true);
    setError("");
    try {
      const data = await getQuiz();
      setQuiz(data);
      setAnswers(Array(data.questions.length).fill(null));
      setCurrent(0);
      setResult(null);
      setMode("quiz");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      setError(getErrorMessage(err, "Could not load the quiz."));
    } finally {
      setBusy(false);
    }
  };

  const choose = (index) => setAnswers((list) => list.map((a, i) => (i === current ? index : a)));

  const submit = async () => {
    setBusy(true);
    setError("");
    try {
      const data = await submitQuiz(answers);
      setResult(data);
      setMode("result");
      if (data.passed) setStatus((s) => ({ ...(s || {}), passed: true, bestScore: Math.max(s?.bestScore || 0, data.score), certificate: data.certificate }));
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      setError(getErrorMessage(err, "Could not submit your answers."));
    } finally {
      setBusy(false);
    }
  };

  const download = async (certificate) => {
    setCertBusy(true);
    setError("");
    try {
      const { downloadCertificate } = await import("../utils/pdf");
      await downloadCertificate(certificate, t, lang);
    } catch (err) {
      setError(getErrorMessage(err, "Could not make your certificate."));
    } finally {
      setCertBusy(false);
    }
  };

  const progress = Math.round((read.length / LESSONS.length) * 100);
  const question = quiz?.questions[current];
  const answeredCount = useMemo(() => answers.filter((a) => a !== null).length, [answers]);
  const certificate = result?.certificate || status?.certificate;

  return (
    <div className="portal-page">
      <AppNavbar showLogout />

      <div className="portal-content course-page">
        <button className="portal-back" onClick={() => (mode === "lessons" ? navigate("/dashboard") : setMode("lessons"))}>
          <ArrowLeft size={14} /> {mode === "lessons" ? t("Back to dashboard") : t("Back to lessons")}
        </button>

        <div className="course-hero">
          <div className="course-hero-icon"><GraduationCap size={30} /></div>
          <div>
            <h1>{t("First-Aid Course")}</h1>
            <p>{t("8 short lessons and a 10-question quiz. Score 8 or more to get your \"First-Aid Aware\" certificate.")}</p>
          </div>
        </div>

        {error && <div className="portal-message error">{t(error)}</div>}

        {mode === "lessons" && (
          <>
            {status?.passed && certificate && (
              <div className="course-passed">
                <Trophy size={28} />
                <div>
                  <strong>{t("You're First-Aid Aware!")}</strong>
                  <span>{t("Best score: {score} out of {total}", { score: status.bestScore, total: status.total || 10 })}</span>
                </div>
                <button className="portal-btn primary small" onClick={() => download(certificate)} disabled={certBusy}>
                  <FileBadge size={14} /> {certBusy ? t("Preparing PDF…") : t("Download certificate")}
                </button>
              </div>
            )}

            <div className="portal-panel course-progress">
              <div className="course-progress-top">
                <span><BookOpen size={15} /> {t("{done} of {total} lessons done", { done: read.length, total: LESSONS.length })}</span>
                <strong>{progress}%</strong>
              </div>
              <div className="course-bar"><span style={{ width: `${progress}%` }} /></div>
            </div>

            <div className="course-lessons">
              {LESSONS.map((lesson, index) => {
                const Icon = lesson.icon;
                const done = read.includes(lesson.id);
                const open = openLesson === lesson.id;
                return (
                  <div key={lesson.id} className={`course-lesson${done ? " done" : ""}${open ? " open" : ""}`}>
                    <button className="course-lesson-head" onClick={() => setOpenLesson(open ? null : lesson.id)} aria-expanded={open}>
                      <span className="course-lesson-num">{done ? <Check size={16} /> : index + 1}</span>
                      <span className="course-lesson-icon"><Icon size={18} /></span>
                      <span className="course-lesson-title">
                        <strong>{t(lesson.title)}</strong>
                        <small>{t(lesson.summary)}</small>
                      </span>
                      <ChevronDown size={18} className="course-chevron" />
                    </button>
                    {open && (
                      <div className="course-lesson-body">
                        <ol>
                          {lesson.steps.map((step) => <li key={step}>{t(step)}</li>)}
                        </ol>
                        {lesson.dont?.length > 0 && (
                          <div className="course-dont">
                            <strong><CircleAlert size={14} /> {t("Don't")}</strong>
                            <ul>{lesson.dont.map((item) => <li key={item}>{t(item)}</li>)}</ul>
                          </div>
                        )}
                        {lesson.callWhen && (
                          <p className="course-call"><Phone size={13} /> <span><strong>{t("Call for help:")}</strong> {t(lesson.callWhen)}</span></p>
                        )}
                        <button className="portal-btn primary small" onClick={() => markRead(lesson.id)}>
                          <Check size={14} /> {done ? t("Done — next lesson") : t("I've learned this")}
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="course-quiz-cta">
              <div>
                <strong>{t("Ready for the quiz?")}</strong>
                <span>{read.length < LESSONS.length ? t("We suggest finishing the lessons first, but you can start any time.") : t("Great — you've finished every lesson.")}</span>
              </div>
              <button className="portal-btn primary" onClick={startQuiz} disabled={busy}>
                {busy ? t("Loading…") : status?.passed ? t("Take the quiz again") : t("Start the quiz")} <ArrowRight size={16} />
              </button>
            </div>
          </>
        )}

        {mode === "quiz" && question && (
          <div className="portal-panel course-quiz">
            <div className="course-dots">
              {quiz.questions.map((q, i) => (
                <button
                  key={q.index}
                  className={`${i === current ? "current" : ""}${answers[i] !== null ? " answered" : ""}`}
                  onClick={() => setCurrent(i)}
                  aria-label={t("Question {n}", { n: i + 1 })}
                />
              ))}
            </div>
            <span className="course-qnum">{t("Question {n} of {total}", { n: current + 1, total: quiz.questions.length })}</span>
            <h2>{t(question.question)}</h2>
            <div className="course-options">
              {question.options.map((option, i) => (
                <button key={option} className={`course-option${answers[current] === i ? " chosen" : ""}`} onClick={() => choose(i)}>
                  <span className="course-letter">{"ABCD"[i]}</span>
                  {t(option)}
                </button>
              ))}
            </div>
            <div className="course-quiz-nav">
              <button className="portal-btn ghost" onClick={() => setCurrent((c) => c - 1)} disabled={current === 0}>
                <ArrowLeft size={15} /> {t("Back")}
              </button>
              {current < quiz.questions.length - 1 ? (
                <button className="portal-btn primary" onClick={() => setCurrent((c) => c + 1)} disabled={answers[current] === null}>
                  {t("Next")} <ArrowRight size={15} />
                </button>
              ) : (
                <button className="portal-btn primary" onClick={submit} disabled={busy || answeredCount < quiz.questions.length}>
                  {busy ? t("Checking…") : t("Submit answers")} <Check size={15} />
                </button>
              )}
            </div>
          </div>
        )}

        {mode === "result" && result && (
          <div className="course-result">
            <div className={`course-score ${result.passed ? "pass" : "fail"}`}>
              <div className="course-ring" style={{ "--pct": `${(result.score / result.total) * 100}%` }}>
                <span>{result.score}<small>/{result.total}</small></span>
              </div>
              <div>
                <h2>{result.passed ? t("Congratulations — you passed!") : t("Not quite — you need {mark} to pass.", { mark: result.passMark })}</h2>
                <p>{result.passed ? t("You're now First-Aid Aware. Download your certificate below.") : t("Read the lessons again and have another go. You can retry as often as you like.")}</p>
                <div className="course-result-actions">
                  {result.passed && certificate && (
                    <>
                      <button className="portal-btn primary" onClick={() => download(certificate)} disabled={certBusy}>
                        <FileBadge size={16} /> {certBusy ? t("Preparing PDF…") : t("Download certificate")}
                      </button>
                      <Link className="portal-btn ghost" to={`/verify/${certificate.code}`} target="_blank">
                        <ExternalLink size={15} /> {t("Public verify page")}
                      </Link>
                    </>
                  )}
                  <button className="portal-btn ghost" onClick={result.passed ? () => setMode("lessons") : startQuiz}>
                    <RotateCcw size={15} /> {result.passed ? t("Back to lessons") : t("Try again")}
                  </button>
                </div>
              </div>
            </div>

            <h3 className="course-review-title">{t("Your answers")}</h3>
            <div className="course-review">
              {quiz.questions.map((q, i) => {
                const r = result.results[i];
                return (
                  <div key={q.index} className={`course-review-item ${r.correct ? "right" : "wrong"}`}>
                    <span className="course-review-icon">{r.correct ? <Check size={16} /> : <X size={16} />}</span>
                    <div>
                      <strong>{t(q.question)}</strong>
                      {!r.correct && <span className="course-yours">{t("Your answer: {answer}", { answer: t(q.options[answers[i]]) })}</span>}
                      <span className="course-right">{t("Correct answer: {answer}", { answer: t(q.options[r.correctIndex]) })}</span>
                      <p>{t(r.explanation)}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default FirstAidCourse;
