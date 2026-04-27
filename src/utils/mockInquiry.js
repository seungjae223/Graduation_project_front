const STORAGE_KEY = "admin_inquiry_page_v1";

const createSeedInquiries = () => {
  const now = Date.now();

  const hoursAgo = (hours) =>
    new Date(now - hours * 60 * 60 * 1000).toISOString();

  const daysAgo = (days) =>
    new Date(now - days * 24 * 60 * 60 * 1000).toISOString();

  return [
    {
      id: "inq-001",
      uid: "travel_king_99",
      title: "예약 환불 요청",
      content:
        "안녕하세요. 지난 주말에 예약했던 제주도 투어 상품을 개인 사정으로 취소하게 됐습니다. 환불 규정과 환불 가능 여부 확인 부탁드립니다.",
      customerName: "김철수",
      customerEmail: "travel_king_99@email.com",
      customerGrade: "Regular",
      status: "pending",
      createdAt: hoursAgo(2),
      bookingNumber: "TR-240315-001",
      checkInDate: "2024-06-10",
      answer: "",
      answeredAt: null,
    },
    {
      id: "inq-002",
      uid: "blue_sky_ocean",
      title: "포인트 적립 누락",
      content:
        "어제 완료한 투어에 대한 포인트를 아직 들어오지 않았습니다. 확인 부탁드립니다. 결제 번호는 확인 후 전달드릴 수 있습니다.",
      customerName: "박민호",
      customerEmail: "blue_sky_ocean@email.com",
      customerGrade: "Premium",
      status: "pending",
      createdAt: hoursAgo(5),
      bookingNumber: "PT-240315-005",
      checkInDate: "",
      answer: "",
      answeredAt: null,
    },
    {
      id: "inq-003",
      uid: "nomad_life_24",
      title: "계정 인증 오류",
      content:
        "휴대폰 본인 인증 단계에서 계속 에러를 발생합니다. 다른 인증 수단이 있는지 궁금합니다. 크롬 브라우저에서도 동일한 문제가 발생했습니다.",
      customerName: "이지민",
      customerEmail: "nomad_life_24@email.com",
      customerGrade: "VIP",
      status: "answered",
      createdAt: daysAgo(1),
      bookingNumber: "",
      checkInDate: "",
      answer:
        "본인 인증 오류는 통신사 인증 서버 지연으로 확인되었습니다. 잠시 후 다시 시도하시거나 고객센터로 연락 주시면 수동 확인을 도와드리겠습니다.",
      answeredAt: hoursAgo(20),
    },
  ];
};

const canUseStorage = () =>
  typeof window !== "undefined" && !!window.localStorage;

const readInquiries = () => {
  if (!canUseStorage()) return createSeedInquiries();

  const saved = window.localStorage.getItem(STORAGE_KEY);

  if (!saved) {
    const seed = createSeedInquiries();
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(seed));
    return seed;
  }

  try {
    return JSON.parse(saved);
  } catch {
    const seed = createSeedInquiries();
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(seed));
    return seed;
  }
};

const writeInquiries = (data) => {
  if (!canUseStorage()) return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
};

export const getInquiryList = () => {
  return [...readInquiries()].sort(
    (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
  );
};

export const getInquiryById = (id) => {
  return readInquiries().find((item) => item.id === id);
};

export const submitInquiryAnswer = (id, answer) => {
  const current = readInquiries();

  const next = current.map((item) =>
    item.id === id
      ? {
          ...item,
          status: "answered",
          answer,
          answeredAt: new Date().toISOString(),
        }
      : item
  );

  writeInquiries(next);

  return next.find((item) => item.id === id);
};