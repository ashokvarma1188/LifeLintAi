import api from "./api";

/* The first-aid course quiz. Marking happens on the server. */

export async function getQuiz() {
  const { data } = await api.get("/course/quiz");
  return data;
}

export async function getCourseStatus() {
  const { data } = await api.get("/course/status");
  return data;
}

export async function submitQuiz(answers) {
  const { data } = await api.post("/course/submit", { answers });
  return data;
}
