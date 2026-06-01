import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import "./PrivacyPolicyModal.css";

const POLICY_SECTIONS = [
  {
    id: 1,
    title: "제1조 (목적)",
    content: `본 약관은 회사가 제공하는 위치기반서비스(이하 "서비스")를 이용함에 있어 회사와 이용자의 권리, 의무 및 책임사항을 규정함을 목적으로 합니다. 회사는 이용자에게 최적의 이동 수단 및 정보를 제공하기 위해 본 약관을 제정하였습니다.`,
  },
  {
    id: 2,
    title: "제2조 (용어의 정의)",
    content: `1. "서비스"란 회사가 제공하는 위치기반서비스 전반을 의미합니다.
2. "이용자"란 회사의 서비스에 접속하여 본 약관에 따라 서비스를 이용하는 고객을 말합니다.
3. "위치정보"란 특정 개인이 위치하는 장소의 정보를 말합니다.`,
  },
  {
    id: 3,
    title: "제3조 (약관의 효력 및 변경)",
    content: `본 약관은 서비스를 신청한 고객 또는 개인위치정보주체가 본 약관에 동의하고 회사가 정한 소정의 절차에 따라 서비스의 이용자로 등록함으로써 효력이 발생합니다. 회사는 합리적인 사유가 발생할 경우 관계법령을 위배하지 않는 범위 내에서 약관을 개정할 수 있습니다.`,
  },
  {
    id: 4,
    title: "제4조 (관계법령의 적용)",
    content: `본 약관은 신의성실의 원칙에 따라 공정하게 적용하며, 약관에 명시되지 아니한 사항에 대하여는 위치정보의 보호 및 이용 등에 관한 법률, 정보통신망 이용촉진 및 정보보호 등에 관한 법률 등 관계법령 또는 상관례에 따릅니다.`,
  },
  {
    id: 5,
    title: "제5조 (서비스의 내용)",
    content: `회사는 위치정보를 활용하여 다음 각 호의 서비스를 제공합니다.
1. 현재 위치 기반 주변 명소 및 매장 추천
2. 실시간 경로 안내 및 소요 시간 예측
3. 사용자 간 실시간 위치 공유 기능
4. 위치 기반 이벤트 정보 및 쿠폰 제공`,
  },
  {
    id: 6,
    title: "제6조 (서비스 이용요금)",
    content: `회사가 제공하는 서비스는 기본적으로 무료입니다. 다만, 데이터 통신료는 이용자가 가입한 이동통신사의 요금제에 따라 별도로 부과될 수 있습니다. 유료 서비스가 도입될 경우 별도의 공지를 통해 안내합니다.`,
  },
  {
    id: 7,
    title: "제7조 (서비스 이용의 제한 및 중지)",
    content: `회사는 다음 각 호에 해당하는 경우 서비스의 전부 또는 일부를 제한하거나 중지할 수 있습니다.
1. 서비스용 설비의 보수 등 공사로 인한 부득이한 경우
2. 정전, 설비 장애 또는 이용량 폭주로 정상적인 서비스 이용에 지장이 있는 경우
3. 천재지변, 국가비상사태 등 불가항력적 사유가 있는 경우`,
  },
  {
    id: 8,
    title: "제8조 (개인위치정보의 이용 또는 제공)",
    content: `회사는 개인위치정보를 이용하여 서비스를 제공하고자 하는 경우에는 미리 이용약관에 명시한 후 개인위치정보주체의 동의를 얻어야 합니다. 회사는 타인에게 위치정보를 제공할 경우 제공받는 자, 제공일시 및 목적을 기록하여 보존합니다.`,
  },
  {
    id: 9,
    title: "제9조 (개인위치정보주체의 권리)",
    content: `이용자는 회사에 대하여 언제든지 개인위치정보를 이용한 위치기반서비스 제공 및 개인위치정보의 제3자 제공에 대한 동의의 전부 또는 일부를 철회할 수 있습니다. 또한 이용자는 위치정보 이용 및 제공 사실 확인자료의 열람 및 고지, 오류 정정을 요구할 수 있습니다.`,
  },
  {
    id: 10,
    title: "제10조 (법정대리인의 권리)",
    content: `회사는 14세 미만의 아동으로부터 개인위치정보를 수집·이용 또는 제공하고자 하는 경우에는 그 법정대리인의 동의를 얻어야 합니다. 법정대리인은 아동의 개인위치정보 보호를 위해 본 약관에 따른 모든 권리를 행사할 수 있습니다.`,
  },
  {
    id: 11,
    title: "제11조 (위치정보 이용·제공사실 확인자료의 보유근거 및 보유기간)",
    content: `회사는 위치정보의 보호 및 이용 등에 관한 법률 제16조 제2항에 따라 고객에 대한 위치정보 이용·제공사실 확인자료를 위치정보시스템에 자동으로 기록하며, 해당 자료는 6개월 이상 보관합니다.`,
  },
  {
    id: 12,
    title: "제12조 (서비스의 변경 및 중지)",
    content: `회사가 서비스를 변경하거나 중지하는 경우 회사는 이용자에게 사전 고지함을 원칙으로 합니다. 다만, 긴급한 상황의 경우 사후에 공지할 수 있습니다.`,
  },
  {
    id: 13,
    title: "제13조 (손해배상)",
    content: `회사가 위치정보의 보호 및 이용 등에 관한 법률 제15조 내지 제26조의 규정을 위반한 행위로 이용자에게 손해가 발생한 경우 이용자는 회사에 대하여 손해배상 청구를 할 수 있습니다. 회사는 고의 또는 과실이 없음을 입증하지 아니하면 책임을 면할 수 없습니다.`,
  },
  {
    id: 14,
    title: "제14조 (면책)",
    content: `회사는 천재지변 또는 이에 준하는 불가항력으로 인하여 서비스를 제공할 수 없는 경우에는 서비스 제공에 관한 책임이 면제됩니다. 또한 이용자의 귀책사유로 인한 서비스 이용 장애에 대하여는 책임을 지지 않습니다.`,
  },
  {
    id: 15,
    title: "제15조 (분쟁의 조정 등)",
    content: `서비스 이용과 관련하여 회사와 이용자 사이에 분쟁이 발생한 경우, 우선적으로 성실히 협의하여 해결하되 협의가 되지 않을 경우 방송통신위원회에 조정을 신청하거나 법원에 소를 제기할 수 있습니다.`,
  },
];

const PrivacyPolicyModal = ({ isOpen, onClose, onAgree }) => {
  const [openSectionId, setOpenSectionId] = useState(null);

  const noticeDate = useMemo(() => {
    return new Intl.DateTimeFormat("ko-KR", {
      year: "numeric",
      month: "long",
      day: "numeric",
    }).format(new Date());
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      setOpenSectionId(null);
    }
  }, [isOpen]);

  const handleToggleSection = (sectionId) => {
    setOpenSectionId((prev) => (prev === sectionId ? null : sectionId));
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="privacy-modal-overlay">
      <div className="privacy-modal">
        <button
          type="button"
          className="privacy-modal-close"
          onClick={onClose}
          aria-label="개인정보 처리방침 모달 닫기"
        >
          ×
        </button>

        <div className="privacy-modal-header">
          <p className="privacy-modal-brand">너만 오면 go</p>
          <h2>개인정보 처리방침</h2>
        </div>

        <div className="privacy-modal-content">
          <div className="privacy-notice-card">
            <p>공시일자: {noticeDate}</p>
            <strong>
              아래 항목을 눌러 개인정보 처리방침 전체 내용을 확인해 주세요.
            </strong>
          </div>

          <div className="privacy-section-list">
            {POLICY_SECTIONS.map((section) => {
              const isOpenSection = openSectionId === section.id;

              return (
                <section
                  key={section.id}
                  className={`privacy-section ${
                    isOpenSection ? "privacy-section-open" : ""
                  }`}
                >
                  <button
                    type="button"
                    className="privacy-section-button"
                    onClick={() => handleToggleSection(section.id)}
                  >
                    <span>{section.title}</span>
                    <span className="privacy-section-arrow">
                      {isOpenSection ? "⌃" : "⌄"}
                    </span>
                  </button>

                  {isOpenSection && (
                    <div className="privacy-card">
                      {section.content.split("\n").map((line, index) => (
                        <p key={index}>{line || "\u00A0"}</p>
                      ))}
                    </div>
                  )}
                </section>
              );
            })}
          </div>
        </div>

        <div className="privacy-modal-bottom">
          <button type="button" onClick={onAgree}>
            모든 약관에 동의하고 시작하기
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default PrivacyPolicyModal;