import { requireList } from "../api/responseContract";

const text = value => typeof value === "string" ? value.trim() : "";
export function formatInquiryDate(value) {
  if (!value) return "";
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "";
  return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, "0")}.${String(date.getDate()).padStart(2, "0")}`;
}

export function normalizeInquiry(record) {
  if (!record || typeof record !== "object" || Array.isArray(record)) throw new Error("문의 응답을 확인할 수 없습니다.");
  const raw = record.originalData || record;
  const id = raw.id ?? raw.inquiryId ?? raw.questionId;
  if (id === undefined || id === null || !String(id).trim()) throw new Error("문의 식별자를 확인할 수 없습니다.");
  const source = raw.answer || raw.reply || raw.answerContent || raw.answerText || raw.response;
  const answerObject = source && typeof source === "object" && !Array.isArray(source) ? source : {};
  const answer = text(source) || text(answerObject.body) || text(answerObject.content) || text(answerObject.answerBody) || text(answerObject.answerContent);
  const rawStatus = text(raw.status).toLowerCase().replace(/\s/g, "");
  const reportedAnswered = raw.answered === true || raw.isAnswered === true || ["answered", "complete", "completed", "done", "답변완료"].includes(rawStatus);
  const reportedPending = ["pending", "waiting", "답변대기"].includes(rawStatus);
  const statusText = answer && reportedPending ? "답변 상태 확인 필요" : !answer && reportedAnswered ? "답변 내용 확인 필요" : answer ? "답변 완료" : "답변 대기";
  const createdAt = raw.createdAt || raw.createdDate || raw.date || "";
  return {
    id, title: text(raw.title) || text(raw.subject) || "제목 없음",
    content: text(raw.detailContent) || text(raw.fullContent) || text(raw.content) || text(raw.question) || text(raw.body),
    userEmail: text(raw.userEmail) || text(raw.email) || text(raw.customerEmail),
    customerName: text(raw.customerName) || text(raw.name) || text(raw.nickname),
    customerGrade: text(raw.customerGrade) || text(raw.grade),
    bookingNumber: text(raw.bookingNumber), checkInDate: text(raw.checkInDate),
    createdAt, date: formatInquiryDate(createdAt), time: text(raw.time) || text(raw.createdTime),
    inquiryCode: text(raw.inquiryCode) || text(raw.code),
    answer, answered: reportedAnswered || Boolean(answer), status: reportedAnswered || answer ? "answered" : "pending", statusText,
    answerData: answer ? {
      body: answer, team: text(answerObject.team) || text(answerObject.answerTeam),
      date: formatInquiryDate(answerObject.date || answerObject.answerDate || answerObject.createdAt || raw.answeredAt || raw.answerDate),
      intro: text(answerObject.intro) || text(answerObject.answerIntro),
      progressTitle: text(answerObject.progressTitle) || text(answerObject.statusTitle),
      progressText: text(answerObject.progressText) || text(answerObject.statusText),
      outro: text(answerObject.outro) || text(answerObject.answerOutro), end: text(answerObject.end) || text(answerObject.answerEnd),
    } : null,
    originalData: raw,
  };
}

export function readInquiryList(data) { return requireList(data).map(normalizeInquiry); }

export function inquiryErrorMessage(error, fallback) {
  const status = error?.response?.status;
  if (status === 401) return "로그인 정보가 만료되었습니다. 다시 로그인해 주세요.";
  if (status === 403) return "이 문의를 조회하거나 답변할 권한이 없습니다.";
  if (status === 404) return "문의 내용을 찾을 수 없습니다.";
  return fallback;
}
