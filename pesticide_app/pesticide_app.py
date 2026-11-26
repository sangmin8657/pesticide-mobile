import reflex as rx


def searchable_select(prefix: str, label_text: str, placeholder_text: str) -> rx.Component:
    """목록 선택(▼)과 검색어 자동완성을 동시에 지원하는 콤보박스"""
    return rx.el.div(
        rx.el.label(label_text, html_for=f"{prefix}-input", class_name="field-label"),
        rx.el.div(
            rx.el.input(
                id=f"{prefix}-input",
                type="text",
                placeholder=placeholder_text,
                auto_complete="off",
                class_name="form-control combo-input",
            ),
            rx.el.button(
                "×",
                id=f"{prefix}-clear",
                type="button",
                title="초기화",
                class_name="combo-clear-btn",
                style={"display": "none"},
            ),
            rx.el.button(
                "▼",
                id=f"{prefix}-toggle",
                type="button",
                title="전체 목록 열기",
                class_name="combo-toggle-btn",
            ),
            rx.el.div(
                id=f"{prefix}-dropdown",
                class_name="combo-dropdown",
                style={"display": "none"},
            ),
            id=f"{prefix}-wrapper",
            class_name="combo-wrapper",
        ),
        class_name="filter-item",
    )


def index() -> rx.Component:
    return rx.box(
        rx.el.div(
            # 1. 메인 헤더 영역
            rx.el.div(
                rx.el.h1("⛳ 골프장 농약 안전사용 도우미", class_name="main-title"),
                rx.el.img(
                    src="/nier_logo.png",
                    alt="국립환경과학원 로고",
                    class_name="header-logo",
                ),
                class_name="header-container",
            ),
            # 2. 메인 탭 버튼
            rx.el.div(
                rx.el.button(
                    "🔍 농약 검색",
                    id="tab-btn-search",
                    class_name="tab-btn active",
                    type="button",
                ),
                rx.el.button(
                    "🧪 희석배수 계산기",
                    id="tab-btn-calc",
                    class_name="tab-btn",
                    type="button",
                ),
                class_name="tab-bar",
            ),
            # ==========================================
            # TAB 1: 농약 검색
            # ==========================================
            rx.el.div(
                # (1) 상단 검색 필터 박스
                rx.el.div(
                    rx.el.div(
                        rx.el.h2("🔍 농약 검색 조건", class_name="section-title"),
                        rx.el.button(
                            "↺ 조건 초기화",
                            id="reset-btn",
                            class_name="reset-btn",
                            type="button",
                        ),
                        class_name="section-header-row",
                    ),
                    rx.el.div(
                        searchable_select("use", "1. 용도 선택", "전체 (선택 또는 입력)"),
                        searchable_select("crop", "2. 작물 선택", "전체 (선택 또는 예: 잔디 입력)"),
                        searchable_select("pest", "3. 적용 병해충 선택", "전체 (선택 또는 병해충 입력)"),
                        class_name="filter-grid",
                    ),
                    rx.el.div(
                        rx.el.label(
                            "4. 상표명 / 품목명 / 성분명 키워드 검색",
                            html_for="keyword-input",
                            class_name="field-label",
                        ),
                        rx.el.div(
                            rx.el.input(
                                id="keyword-input",
                                type="search",
                                placeholder="예: 가가방, 수화제, 가스가마이신 등",
                                class_name="form-control keyword-input-field",
                            ),
                            rx.el.button(
                                "🔍 검색",
                                id="search-submit-btn",
                                type="button",
                                class_name="search-submit-btn",
                            ),
                            class_name="keyword-input-row",
                        ),
                        class_name="keyword-box",
                    ),
                    class_name="card-box",
                ),
                # (2) 검색 결과 요약 지표 (모바일 가로 1줄 4칸)
                rx.el.div(
                    rx.el.div(
                        rx.el.div("검색 결과", class_name="metric-label"),
                        rx.el.div("로딩 중...", id="metric-total", class_name="metric-value"),
                        class_name="metric-box",
                    ),
                    rx.el.div(
                        rx.el.div("대상 작물", class_name="metric-label"),
                        rx.el.div("-", id="metric-crops", class_name="metric-value"),
                        class_name="metric-box",
                    ),
                    rx.el.div(
                        rx.el.div("대상 병해충", class_name="metric-label"),
                        rx.el.div("-", id="metric-pests", class_name="metric-value"),
                        class_name="metric-box",
                    ),
                    rx.el.div(
                        rx.el.div("검색 상표수", class_name="metric-label"),
                        rx.el.div("-", id="metric-brands", class_name="metric-value"),
                        class_name="metric-box",
                    ),
                    id="metric-section",
                    class_name="metric-container",
                ),
                # (3) 검색 결과 목록 & CSV 다운로드 (항목 터치 시 즉시 상세 팝업 오픈)
                rx.el.div(
                    rx.el.div(
                        rx.el.h2("📋 검색 결과 목록", class_name="section-title"),
                        rx.el.button(
                            "📥 전체 검색결과 CSV 다운로드",
                            id="download-csv-btn",
                            class_name="download-btn",
                            type="button",
                        ),
                        class_name="section-header-row",
                    ),
                    rx.el.p(
                        "💡 아래 목록에서 농약 카드를 터치하면 상세 안전사용지침이 바로 열립니다.",
                        class_name="sub-caption",
                    ),
                    rx.el.div(id="list-notice", class_name="info-banner", style={"display": "none"}),
                    rx.el.div(id="result-list", class_name="result-list"),
                    class_name="card-box",
                ),
                id="tab-panel-search",
            ),
            # ==========================================
            # TAB 2: 희석배수 계산기 (작물·농약 검색 연동)
            # ==========================================
            rx.el.div(
                rx.el.div(
                    rx.el.div(
                        rx.el.h2("🧪 희석배수 계산기", class_name="section-title"),
                        rx.el.button(
                            "↺ 계산기 초기화",
                            id="calc-reset-btn",
                            class_name="reset-btn",
                            type="button",
                        ),
                        class_name="section-header-row",
                    ),
                    rx.el.p(
                        "적용작물과 농약을 검색해 선택하면 기준 희석배수가 자동 입력됩니다. 살포할 물의 양만 입력하세요.",
                        class_name="sub-caption",
                    ),
                    # ① 적용작물 및 농약 검색 선택 영역
                    rx.el.div(
                        searchable_select(
                            "calc-crop",
                            "1단계. 적용작물 선택 (선택 또는 검색)",
                            "전체 작물 (예: 잔디 입력)",
                        ),
                        searchable_select(
                            "calc-pesticide",
                            "2단계. 농약 선택 (상표명 / 품목명 / 병해충 검색)",
                            "농약명 또는 병해충명 입력...",
                        ),
                        class_name="calc-search-grid",
                    ),
                    # 선택된 농약의 기준 희석배수 안내 박스
                    rx.el.div(
                        id="calc-selected-info",
                        class_name="calc-selected-box",
                        style={"display": "none"},
                    ),
                    # ② 물의 양 및 희석배수 입력 영역
                    rx.el.div(
                        rx.el.div(
                            rx.el.div("3단계. 입력단위 선택", class_name="field-label"),
                            rx.el.div(
                                rx.el.label(
                                    rx.el.input(
                                        id="unit-radio-l",
                                        type="radio",
                                        name="unit-type",
                                        value="L",
                                        default_checked=True,
                                    ),
                                    " 리터 (L)",
                                    class_name="radio-label",
                                ),
                                rx.el.label(
                                    rx.el.input(
                                        id="unit-radio-mal",
                                        type="radio",
                                        name="unit-type",
                                        value="MAL",
                                    ),
                                    " 말 (1말 = 20L)",
                                    class_name="radio-label",
                                ),
                                class_name="radio-group",
                            ),
                            class_name="filter-item",
                        ),
                        rx.el.div(
                            rx.el.label(
                                "4단계. 살포할 물의 양 (L)",
                                id="water-input-label",
                                html_for="water-input",
                                class_name="field-label",
                            ),
                            rx.el.input(
                                id="water-input",
                                type="number",
                                step="any",
                                min="0",
                                default_value="20",
                                input_mode="decimal",
                                class_name="form-control",
                            ),
                            class_name="filter-item",
                        ),
                        rx.el.div(
                            rx.el.label("5단계. 적용 희석배수 (배)", html_for="dilution-input", class_name="field-label"),
                            rx.el.input(
                                id="dilution-input",
                                type="number",
                                step="any",
                                min="1",
                                default_value="1000",
                                input_mode="numeric",
                                class_name="form-control",
                            ),
                            rx.el.div(
                                rx.el.button("500배", type="button", class_name="preset-btn", custom_attrs={"data-ratio": "500"}),
                                rx.el.button("1,000배", type="button", class_name="preset-btn", custom_attrs={"data-ratio": "1000"}),
                                rx.el.button("1,500배", type="button", class_name="preset-btn", custom_attrs={"data-ratio": "1500"}),
                                rx.el.button("2,000배", type="button", class_name="preset-btn", custom_attrs={"data-ratio": "2000"}),
                                class_name="preset-row",
                            ),
                            class_name="filter-item",
                        ),
                        class_name="filter-grid",
                        style={"marginTop": "12px"},
                    ),
                    # ③ 자동 계산 결과 출력
                    rx.el.div(
                        rx.el.div("💡 자동 계산 결과", class_name="calc-result-title"),
                        rx.el.div(
                            rx.el.div(
                                rx.el.div("필요한 물의 총량", class_name="calc-box-label"),
                                rx.el.div("20.0 L", id="calc-water-main", class_name="calc-box-value"),
                                rx.el.div("1.0 말", id="calc-water-sub", class_name="calc-box-sub"),
                                class_name="calc-box",
                            ),
                            rx.el.div(
                                rx.el.div("필요한 농약 용량 (자동계산)", class_name="calc-box-label"),
                                rx.el.div("20.0 mL (또는 g)", id="calc-pesticide-val", class_name="calc-box-value highlight"),
                                rx.el.div("1,000배 희석 기준", id="calc-pesticide-sub", class_name="calc-box-sub"),
                                class_name="calc-box",
                            ),
                            class_name="calc-grid",
                        ),
                        rx.el.div(
                            rx.el.strong("📌 사용 안내"),
                            rx.el.ul(
                                rx.el.li("액체 농약(액상수화제, 유제 등)은 1mL ≒ 1g으로 간주하여 계산됩니다."),
                                rx.el.li("약제를 먼저 소량의 물에 완전히 희석한 후 전체 물통에 섞으면 균일하게 혼합됩니다."),
                            ),
                            id="calc-usage-guide",
                            class_name="guide-callout",
                        ),
                        class_name="calc-result-panel",
                    ),
                    class_name="card-box",
                ),
                id="tab-panel-calc",
                style={"display": "none"},
            ),
            # ==========================================
            # 4. 화면 최하단 출처 및 기관 표시 푸터
            # ==========================================
            rx.el.footer(
                rx.el.div(
                    rx.el.img(
                        src="/nier_logo.png",
                        alt="국립환경과학원 로고",
                        class_name="footer-agency-logo",
                    ),
                    rx.el.img(
                        src="/rda_logo.png",
                        alt="농촌진흥청 로고",
                        class_name="footer-agency-logo",
                    ),
                    rx.el.span("농약안전정보센터", class_name="agency-badge"),
                    class_name="footer-logos",
                ),
                rx.el.div(
                    rx.el.strong("📢 데이터 출처 및 안내"),
                    rx.el.br(),
                    "본 서비스는 ",
                    rx.el.strong("농촌진흥청"),
                    "에서 운영하는 ",
                    rx.el.strong("농약안전정보센터"),
                    "의 제공데이터를 활용하여 ",
                    rx.el.strong("국립환경과학원"),
                    "에서 구축하였습니다.",
                    rx.el.br(),
                    rx.el.span(
                        "※ 본 앱의 검색 결과 및 계산 결과는 토양·지하수 환경 보호 및 골프장 농약 안전사용 관리를 돕기 위한 참고 정보이며, 실제 사용 시 제품의 용기 표기 지침을 반드시 확인하시기 바랍니다.",
                        class_name="footer-disclaimer",
                    ),
                ),
                class_name="footer-container",
            ),
            class_name="app-wrapper",
        ),
        # ==========================================
        # 5. 상세 안전사용지침 즉시 팝업 모달 (스크롤 불필요)
        # ==========================================
        rx.el.div(
            rx.el.div(
                rx.el.div(
                    rx.el.span("🔎 상세 안전사용지침", class_name="modal-header-title"),
                    rx.el.button(
                        "✕ 닫기",
                        id="detail-modal-close",
                        type="button",
                        class_name="modal-close-btn",
                    ),
                    class_name="modal-header",
                ),
                rx.el.div(id="detail-modal-body", class_name="modal-body"),
                id="detail-modal-dialog",
                class_name="modal-dialog",
            ),
            id="detail-modal-overlay",
            class_name="modal-overlay",
            style={"display": "none"},
        ),
        class_name="page-bg",
    )


app = rx.App(
    enable_state=False,
    stylesheets=["/style.css"],
    head_components=[rx.script(src="/app.js")],
)
app.add_page(index, title="골프장 농약 안전사용 도우미")
