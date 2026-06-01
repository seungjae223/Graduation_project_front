export const MOCK_INQUIRY_STORAGE_KEY = "mock_user_inquiries";

export const MOCK_INQUIRIES = [
  {
    id: 1,
    inquiryCode: "AZ-Z-992",
    status: "answered",
    statusText: "답변 완료",
    date: "2024.05.21",
    title: "동선 추천이 잘 안 돼요",
    content: "추천 알고리즘이 가끔 현재 위치를 제대로 반영하지...",
    question:
      "안녕하세요. 여행 동선 추천 기능을 사용해보고 있는데, 제가 선택한 경유지들의 순서가 효율적이지 않게 배치되는 것 같아요. 특히 제주 서귀포 지역을 여행할 때 동선이 계속 꼬이는데, 이 부분 수정이 가능할까요? 답변 부탁드립니다.",
    answer: {
      answeredAt: "2024.05.22 09:43",
      managerName: "고객님! Azure Horizon ‘나만 모르는 go’ 서비스를 이용해 주셔서 감사합니다.",
      body:
        "문의하신 세부 위치 추천 오류는 일부 위치 데이터 매핑 과정에서 알고리즘 지연이 발생한 것으로 확인했습니다.",
      progressTitle: "진행 현황",
      progressContent: "알고리즘 위치 업데이트 완료 (v2.4.1)",
      closing:
        "현재 조치가 완료되어 다시 앱을 실행하시면 최적화된 동선을 추천받으실 수 있습니다. 서비스 이용에 불편을 드려 죄송하며, 앞으로 더욱 쾌적한 여행 경험을 제공하기 위해 노력하겠습니다. 추가적인 궁금증이 있으시면 언제든 문의해 주세요. 감사합니다!",
    },
  },
  {
    id: 2,
    inquiryCode: "AZ-Q-184",
    status: "pending",
    statusText: "대기 중",
    date: "2024.05.20",
    title: "장소 추가는 어떻게 하나요?",
    content: "내 일정에 새로운 카페를 추가하고 싶은데 메뉴를 ...",
    question:
      "내 일정에 새로운 카페를 추가하고 싶은데 메뉴를 어디서 눌러야 하는지 잘 모르겠습니다. 일정 생성 중에도 장소를 추가할 수 있나요?",
    answer: null,
  },
  {
    id: 3,
    inquiryCode: "AZ-P-318",
    status: "answered",
    statusText: "답변 완료",
    date: "2024.05.18",
    title: "비밀번호를 바꾸고 싶어요",
    content: "보안상의 이유로 비밀번호를 변경하려고 하는데 방...",
    question:
      "보안상의 이유로 비밀번호를 변경하려고 하는데 방법을 찾기 어렵습니다. 로그인 후 어디에서 변경할 수 있나요?",
    answer: {
      answeredAt: "2024.05.19 11:20",
      managerName: "고객님! Azure Horizon ‘나만 모르는 go’ 서비스를 이용해 주셔서 감사합니다.",
      body:
        "문의하신 비밀번호 변경은 마이페이지 내 계정 설정 메뉴에서 진행하실 수 있습니다.",
      progressTitle: "변경 방법",
      progressContent: "마이페이지 → 계정 설정 → 비밀번호 변경",
      closing:
        "새 비밀번호는 영문, 숫자, 특수문자를 조합하여 설정하시는 것을 권장드립니다. 만약 기존 비밀번호를 잊으신 경우에는 로그인 화면의 비밀번호 찾기 기능을 이용해 주세요. 추가로 도움이 필요하시면 언제든 다시 문의해 주세요.",
    },
  },
  {
    id: 4,
    inquiryCode: "AZ-R-527",
    status: "answered",
    statusText: "답변 완료",
    date: "2024.05.16",
    title: "저장한 장소가 사라졌어요",
    content: "전에 저장해 둔 장소 목록이 보이지 않습니다...",
    question:
      "전에 저장해 둔 장소 목록이 보이지 않습니다. 앱을 다시 실행해도 저장한 장소가 비어 있는데 복구가 가능한가요?",
    answer: {
      answeredAt: "2024.05.17 14:05",
      managerName: "고객님! Azure Horizon ‘나만 모르는 go’ 서비스를 이용해 주셔서 감사합니다.",
      body:
        "저장한 장소 목록이 보이지 않는 현상은 일부 사용자 환경에서 로컬 저장 데이터 갱신이 지연되며 발생할 수 있습니다.",
      progressTitle: "확인 결과",
      progressContent: "저장 장소 동기화 로직 점검 완료",
      closing:
        "현재는 저장 목록이 정상적으로 다시 불러와지도록 수정되었습니다. 앱을 새로고침하거나 다시 로그인하시면 저장한 장소를 확인하실 수 있습니다. 동일한 문제가 반복될 경우 문의 내용을 남겨주시면 추가로 확인해 드리겠습니다.",
    },
  },
];

const readSavedInquiries = () => {
  try {
    const raw = localStorage.getItem(MOCK_INQUIRY_STORAGE_KEY);
    const saved = raw ? JSON.parse(raw) : [];

    if (!Array.isArray(saved)) {
      return [];
    }

    return saved.map((inquiry) => ({
      inquiryCode: inquiry.inquiryCode || `AZ-U-${String(inquiry.id).slice(-3)}`,
      statusText: inquiry.statusText || "대기 중",
      content: inquiry.content || "",
      question: inquiry.content || "",
      answer: inquiry.answer || null,
      ...inquiry,
    }));
  } catch (error) {
    console.error("목업 문의사항 불러오기 실패:", error);
    return [];
  }
};

export const getInquiryList = () => {
  return [...readSavedInquiries(), ...MOCK_INQUIRIES];
};

export const getInquiryById = (inquiryId) => {
  const inquiries = getInquiryList();

  return inquiries.find((inquiry) => String(inquiry.id) === String(inquiryId));
};