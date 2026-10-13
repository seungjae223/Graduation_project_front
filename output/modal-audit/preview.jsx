import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter, useNavigate, useLocation } from 'react-router-dom';
import '../../src/App.css';
import '../../src/index.css';
import Alert from '../../src/Alert/Alert';
import Header from '../../src/Header/Header';
import InputDialog from '../../src/components/InputDialog';
import LoginAlert from '../../src/Login/LoginAlert';
import { SignUpTopAlert, SignupCompleteModal } from '../../src/Login/SignUp';
import PrivacyPolicyModal from '../../src/Login/PrivacyPolicyModal';
import InquirySuccessModal from '../../src/Mypage/InquirySuccessModal';
import { AdminSuccessModal } from '../../src/Admin/AdminInquiryPage/AdminInquiryWrite';
import { LocationPermissionModal } from '../../src/Mypage/MyPage';
import ShareModal from '../../src/ShareModal/ShareModal';
import FolderSelectModal from '../../src/FolderSelectModal/FolderSelectModal';
import StartPlaceModal from '../../src/RouteCreate/StartPlaceModal';
import { FixPointModal, FavoritePlacesModal, CompleteModalPreview } from '../../src/RouteCreate/RouteCreate';
import { MemoModal } from '../../src/RouteResult/RouteResult';
import useMutationTask from '../../src/utils/useMutationTask';
import { applyTheme } from '../../src/utils/theme';
import warningIcon from '../../src/img/파랑색 위치.png';
import api, { counters } from './fixture-api';
import '../../src/responsive.css';
import '../../src/modal.css';

const date = new Date(2026, 9, 14);
const places = Array.from({ length: 12 }, (_, i) => ({ id: String(i + 1), sourceId: String(i + 1), name: `서울 여행 장소 ${i + 1}`, address: '서울특별시 여행 안내 주소', desc: '서울특별시 여행 안내 주소' }));
const initialFolders = Array.from({ length: 12 }, (_, i) => ({ id: String(i + 1), name: `나의 여행 폴더 ${i + 1}`, title: `나의 여행 폴더 ${i + 1}`, status: 'success', places }));
const names = ['알림', '삭제 확인', '네트워크 오류', '로그아웃', '긴 안내', '로그인 오류', '회원가입 오류', '회원가입 완료', '문의 완료', '답변 완료', '일정 생성 완료', '폴더 이름 입력', '폴더 선택', '공유·PDF', '메모 작성', '시작 장소', '시간 수정', '관심 장소', '위치 안내', '약관 안내'];

function Preview() {
  const [modal, setModal] = useState('');
  const [theme, setTheme] = useState('light');
  const [value, setValue] = useState('');
  const [folders, setFolders] = useState(initialFolders);
  const [selected, setSelected] = useState([]);
  const [expanded, setExpanded] = useState(['1']);
  const [hour, setHour] = useState(10);
  const [minute, setMinute] = useState(0);
  const [period, setPeriod] = useState('AM');
  const [fixed, setFixed] = useState(false);
  const [result, setResult] = useState('');
  const navigate = useNavigate();
  const location = useLocation();
  const task = useMutationTask('memo-preview');
  const close = () => { setModal(''); setResult(`DELETE ${counters.delete} · 저장 ${counters.save} · PDF ${counters.pdf}`); };
  const open = name => { task.reset(); setModal(name); };
  const save = () => task.run(() => api.patch('/memo', { value }), async () => ({ applied: true }), { failure: '저장하지 못했어요.', success: '메모를 저장했어요.', refreshFailure: '최신 메모 확인이 필요해요.' });
  return <main style={{ maxWidth: 720, margin: '0 auto', padding: 24, minHeight: 1600 }}>
    <h1 style={{ fontSize: 24 }}>모달 UI 검증</h1>
    <p>실제 서비스 컴포넌트 · 테스트 응답 · 서버 데이터 변경 없음</p>
    <button onClick={() => { const next = theme === 'light' ? 'dark' : 'light'; setTheme(next); applyTheme(next); }} style={{ minHeight: 48 }}>테마: {theme}</button>
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBlock: 20 }}>
      {names.map(name => <button key={name} onClick={() => open(name)} style={{ padding: '10px 14px', minHeight: 48 }}>{name}</button>)}
    </div>
    <button onClick={() => navigate('/route-result?id=7')} style={{ minHeight: 48 }}>일정 상세 테스트</button>
    <p role="status">{result}</p>
    {location.pathname === '/route-result' ? <><Header /><p>테스트 일정 · 삭제 요청은 결과 불명 응답으로 1회만 처리됩니다.</p></> : <p>일정 목록 확인 · 삭제 성공 안내 없음 · DELETE {counters.delete}</p>}
    <Alert open={['알림','삭제 확인','네트워크 오류','로그아웃','긴 안내'].includes(modal)}
      type={modal === '삭제 확인' ? 'delete' : modal === '네트워크 오류' ? 'network' : modal === '로그아웃' ? 'logout' : 'success'}
      title={modal === '긴 안내' ? '최신 상태 확인 필요' : undefined}
      iconSrc={modal === '네트워크 오류' ? warningIcon : undefined}
      description={modal === '긴 안내' ? '긴 안내 문구가 표시되어도 화면 안에서 모든 내용을 확인할 수 있어야 합니다. https://example.com/a-very-long-link-that-should-wrap-without-horizontal-overflow '.repeat(30) : undefined}
      onClose={close} onPrimary={close} onSecondary={close} />
    <LoginAlert open={modal === '로그인 오류'} type="loginFail" iconSrc={warningIcon} onClose={close} />
    <SignUpTopAlert open={modal === '회원가입 오류'} onConfirm={close} />
    <SignupCompleteModal open={modal === '회원가입 완료'} onStart={close} />
    <InquirySuccessModal open={modal === '문의 완료'} onConfirm={close} />
    <AdminSuccessModal open={modal === '답변 완료'} onConfirm={close} />
    <InputDialog open={modal === '폴더 이름 입력'} title="새 폴더 만들기" label="폴더명" value={value} onChange={setValue} onClose={close} onSubmit={() => { counters.save++; close(); }} />
    <FolderSelectModal open={modal === '폴더 선택'} folders={folders} onClose={close} onSave={() => { counters.save++; close(); }} onCreateFolder={({ name }) => { counters.save++; setFolders(previous => [...previous, { id: '99', name }]); }} />
    <ShareModal open={modal === '공유·PDF'} onClose={close} variant="schedule" shareUrl="https://example.com/preview-trip" onSavePdf={async () => { counters.pdf++; throw new Error('Preview PDF failure'); }} />
    <MemoModal isOpen={modal === '메모 작성'} value={value} onChange={setValue} onCancel={close} onSave={save} onRetryRead={task.retryRead} task={task} showSuccess />
    <StartPlaceModal open={modal === '시작 장소'} selectedDates={[date]} placesByDate={{ preview: places }} selectedStartPlaces={{ preview: '1' }} getDateKey={() => 'preview'} onSelectPlace={() => {}} onChangeDay={() => {}} onClose={close} onConfirm={close} />
    <FixPointModal open={modal === '시간 수정'} place={places[0]} period={period} hour={hour} minute={minute} isFixed={fixed} onChangePeriod={setPeriod} onChangeHour={setHour} onChangeMinute={setMinute} onChangeFixed={setFixed} onClose={close} onConfirm={close} />
    <FavoritePlacesModal open={modal === '관심 장소'} status="success" folders={folders} selectedPlaceIds={selected} expandedFolderIds={expanded} selectedDayIndex={0} selectedDates={[date]} onClose={close} onToggleFolder={id => setExpanded(previous => previous.includes(id) ? previous.filter(v => v !== id) : [...previous, id])} onTogglePlace={id => setSelected(previous => previous.includes(id) ? previous.filter(v => v !== id) : [...previous, id])} onChangeDay={() => {}} onConfirm={close} />
    <CompleteModalPreview open={modal === '일정 생성 완료'} onClose={close} />
    {modal === '위치 안내' && <LocationPermissionModal onClose={close} onAllow={close} />}
    <PrivacyPolicyModal isOpen={modal === '약관 안내'} onClose={close} />
  </main>;
}
applyTheme('light');
createRoot(document.getElementById('root')).render(<MemoryRouter initialEntries={['/route-result?id=7']}><Preview /></MemoryRouter>);
