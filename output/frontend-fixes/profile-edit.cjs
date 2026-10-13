const fs = require('fs');
const edit = (path, transform) => fs.writeFileSync(path, transform(fs.readFileSync(path, 'utf8').replace(/^\uFEFF/, '')).replace(/\r\n/g, '\n'));
edit('src/Mypage/Inquiry.jsx', s => {
  s = s.replace('import { getApiErrorMessage as safeApiErrorMessage } from "../api/api";', '').replace('import { logSafeApiError } from "../utils/safeLog";', '');
  s = s.replace('import api from "../api/api";', 'import api from "../api/api";\nimport useReadQuery from "../utils/useReadQuery"; import useSessionKey from "../utils/useSessionKey"; import { getAuthSnapshot } from "../utils/authState"; import { readInquiryList, inquiryErrorMessage } from "./inquiryData";');
  s = s.replace(/const formatDate =[\s\S]*?const Inquiry =/, 'const Inquiry =');
  s = s.replace(/  const \[inquiries, setInquiries\][\s\S]*?  const totalPages/, `  const account = useSessionKey();
  const query = useReadQuery(account + ":inquiries", async signal => readInquiryList((await api.get("/api/inquiries", { signal })).data), account !== "anonymous", () => getAuthSnapshot().accountKey === account);
  const inquiries = query.data || [];
  const isLoading = query.status === "loading" && !query.data;
  const errorMessage = query.status === "error" ? inquiryErrorMessage(query.cause, "문의 목록을 불러오지 못했습니다. 다시 시도해 주세요.") : "";
  useEffect(() => { setCurrentPage(1); }, [account]);

  const totalPages`);
  s = s.replace('    if (!isAnswered) return;', '    if (event.target !== event.currentTarget) return;');
  s = s.replace('<p className="inquiry-card-content">{errorMessage}</p>', '<p className="inquiry-error-message" role="alert">{errorMessage}</p><button type="button" onClick={query.retry}>다시 불러오기</button>');
  s = s.replace(/              !errorMessage &&\r?\n              currentInquiries.map/, '              currentInquiries.map');
  s = s.replace('isAnswered ? "is-clickable" : ""', '"is-clickable"').replace('role={isAnswered ? "button" : undefined}', 'role="button"').replace('tabIndex={isAnswered ? 0 : undefined}', 'tabIndex={0}').replace('isAnswered ? () => handleCheckAnswer(inquiry) : undefined', '() => handleCheckAnswer(inquiry)');
  s = s.replace('{isAnswered ? "답변 완료" : "답변 대기"}', '{inquiry.statusText}').replace('{isAnswered && (', '{(').replace('답변 확인하기', '{isAnswered ? "답변 확인하기" : "문의 내용 보기"}');
  return s;
});
edit('src/Admin/AdminInquiryPage/AdminInquiryPage.jsx', s => {
  s = s.replace('import { getApiErrorMessage as safeApiErrorMessage } from "../../api/api";', '').replace('import { logSafeApiError } from "../../utils/safeLog";', '').replace('import React, { useEffect, useState } from "react";', 'import React from "react";');
  s = s.replace('import api from "../../api/api";', 'import api from "../../api/api";\nimport useReadQuery from "../../utils/useReadQuery"; import useSessionKey from "../../utils/useSessionKey"; import { getAuthSnapshot } from "../../utils/authState"; import { readInquiryList, inquiryErrorMessage } from "../../Mypage/inquiryData";');
  s = s.replace(/const getInquiryArray =[\s\S]*?const AdminInquiryPage =/, 'const AdminInquiryPage =');
  s = s.replace(/  const \[inquiries, setInquiries\][\s\S]*?  const rawTab/, `  const account = useSessionKey();
  const query = useReadQuery(account + ":admin-inquiries", async signal => readInquiryList((await api.get("/api/inquiries/admin", { signal })).data), account !== "anonymous", () => getAuthSnapshot().accountKey === account);
  const inquiries = query.data || [];
  const isLoading = query.status === "loading" && !query.data;
  const errorMessage = query.status === "error" ? inquiryErrorMessage(query.cause, "문의 목록을 불러오지 못했습니다. 다시 시도해 주세요.") : "";

  const rawTab`);
  s = s.replace(/  useEffect\(\(\) => \{[\s\S]*?  const filteredInquiries/, '  const filteredInquiries').replace('    if (item.status === "answered") return;', '');
  s = s.replace('onClick={() => handleTabClick(tab.key)}', 'aria-pressed={selectedTab === tab.key} onClick={() => handleTabClick(tab.key)}');
  s = s.replace('<div className="admin-inquiry-list">', '<div className="admin-inquiry-list">\n        {errorMessage && <div className="admin-inquiry-empty" role="alert">{errorMessage}<button type="button" onClick={query.retry}>다시 불러오기</button></div>}');
  s = s.replace(/\) : errorMessage \? \(\r?\n          <div className="admin-inquiry-empty">\{errorMessage\}<\/div>/, '');
  s = s.replace('filteredInquiries.length === 0 ? (', '!errorMessage && filteredInquiries.length === 0 ? (').replace('{isAnswered ? "답변 완료" : "대기 중"}', '{item.statusText}').replace('이메일: {item.uid}', '이메일: {item.userEmail || "정보 없음"}');
  s = s.replace('disabled={isAnswered || item.id === undefined || item.id === null}', 'disabled={item.id === undefined || item.id === null}').replace('{isAnswered ? "답변 완료됨" : "↩ 답변하기"}', '{isAnswered ? "답변 보기" : "↩ 답변하기"}');
  return s;
});
