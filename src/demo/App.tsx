import { useState } from "react";
import { buildCourseCardViewModels } from "../original/learning-field-view-model";
import { getCatalogPage, type CatalogFieldCard } from "../original/catalog-search";
import CatalogFieldIcon from "../original/CatalogFieldIcon";
import Modal from "../original/Modal";
import StudyTopbar from "../original/StudyTopbar";

const sampleFields: CatalogFieldCard[] = [
  {
    id: "sample-one", name: "예시 분야 가", shortLabel: "가", cardTitle: "예시 학습 가",
    summary: "합성 데이터로 만든 카드입니다.", href: "#sample-one", offerings: ["예시 주제 1", "예시 주제 2"],
    actionLabel: "살펴보기", links: [{ name: "가 첫걸음", label: "첫걸음", href: "#sample-one" }],
  },
  {
    id: "sample-two", name: "예시 분야 나", shortLabel: "나", cardTitle: "예시 학습 나",
    summary: "실제 과정이나 문제는 포함하지 않습니다.", href: "#sample-two", offerings: ["예시 주제 3"],
    actionLabel: "살펴보기", links: [{ name: "나 첫걸음", label: "첫걸음", href: "#sample-two" }],
  },
];

const sampleCourses = buildCourseCardViewModels(
  [{ id: "sample", examType: "demo", name: "합성 과정", summary: "예시", studyMode: "읽기", mockExam: "없음" }],
  (examType) => `#${examType}`,
);

export default function App() {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const { fields, fieldCount } = getCatalogPage(sampleFields, { query });

  return (
    <div className="demo-shell">
      <a className="skip-link" href="#main">본문으로 건너뛰기</a>
      <StudyTopbar
        eyebrow="공개 UI 추출본"
        title="모두의 문제집 화면 조각"
        description="운영 서비스와 연결되지 않은 합성 데이터 데모입니다."
        contentUsesPrimaryHeading={false}
        actions={<button className="demo-button" onClick={() => setOpen(true)}>모달 보기</button>}
      />
      <main id="main">
        <section className="demo-panel" aria-labelledby="catalog-title">
          <h2 id="catalog-title">카탈로그 카드</h2>
          <label htmlFor="catalog-search">예시 카드 검색</label>
          <input id="catalog-search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="가 또는 나" />
          <p role="status">검색 결과 {fieldCount}개</p>
          <div className="demo-grid">
            {fields.map((field, index) => (
              <article className="demo-card" key={field.id}>
                <div className="demo-icon"><CatalogFieldIcon field={index === 0 ? "sql" : "information-processing"} /></div>
                <div><h3>{field.cardTitle}</h3><p>{field.summary}</p><small>{field.offerings.join(" · ")}</small></div>
              </article>
            ))}
          </div>
        </section>
        <section className="demo-panel" aria-labelledby="model-title">
          <h2 id="model-title">카드 변환 함수</h2>
          <p>합성 과정의 화면 경로: <code>{sampleCourses[0].href}</code></p>
        </section>
      </main>
      {open && <Modal title="예시 모달" onClose={() => setOpen(false)}>
        <p>이 창은 실제 계정, 문제 또는 서버 자료를 불러오지 않습니다.</p>
        <button className="demo-button" onClick={() => setOpen(false)}>닫기</button>
      </Modal>}
    </div>
  );
}
