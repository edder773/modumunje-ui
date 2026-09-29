import { strict as assert } from "node:assert";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import CatalogFieldIcon from "../src/original/CatalogFieldIcon";
import StudyTopbar from "../src/original/StudyTopbar";
import { getCatalogPage, searchCatalogFields, type CatalogFieldCard } from "../src/original/catalog-search";
import { buildCourseCardViewModels } from "../src/original/learning-field-view-model";

const fields: CatalogFieldCard[] = [
  { id: "a", name: "가 분야", shortLabel: "가", cardTitle: "가 카드", summary: "예시", href: "#a", offerings: [], actionLabel: "열기", links: [{ name: "가 첫걸음", label: "첫걸음", href: "#a" }] },
  { id: "b", name: "나 분야", shortLabel: "나", cardTitle: "나 카드", summary: "예시", href: "#b", offerings: [], actionLabel: "열기", links: [{ name: "나 첫걸음", label: "첫걸음", href: "#b" }] },
];

test("catalog search narrows supplied cards without importing a registry", () => {
  assert.deepEqual(searchCatalogFields(fields, "가").map((field) => field.id), ["a"]);
  assert.equal(getCatalogPage(fields, { fieldId: "b" }).courseCount, 1);
});

test("card transformation keeps caller supplied data and derives a link", () => {
  const course = { id: "x", examType: "demo", name: "합성 과정", summary: "예시", studyMode: "읽기", mockExam: "없음" };
  assert.deepEqual(buildCourseCardViewModels([course], (type) => `#${type}`), [{ ...course, href: "#demo" }]);
});

test("copied presentational components render synthetic text", () => {
  const markup = renderToStaticMarkup(createElement(StudyTopbar, { eyebrow: "예시", title: "합성 제목", contentUsesPrimaryHeading: false, actions: null }));
  assert.match(markup, /합성 제목/);
  assert.match(renderToStaticMarkup(createElement(CatalogFieldIcon, { field: "sql" })), /<svg/);
});
