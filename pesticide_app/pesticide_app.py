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
            # TAB 2: 희석배수 계산기 ('농약 검색'과 동일 순서 · L 고정 · 범위 등록 농약만 직접 입력 허용)
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
                        "농약 검색과 동일한 순서로 조건을 좁혀 최종 농약을 선택하세요. 범위로 등록된 농약만 희석배수를 직접 입력할 수 있습니다.",
                        class_name="sub-caption",
                    ),
                    # [1단계] 농약 검색 및 선택 (농약 검색 탭과 동일 순서: 용도 → 작물 → 병해충 → 상표/품목/성분)
                    rx.el.div(
                        rx.el.div("1단계. 농약 검색 및 최종 선택", class_name="calc-step-heading"),
                        rx.el.div(
                            searchable_select("calc-use", "1. 용도 선택", "전체 (선택 또는 입력)"),
                            searchable_select("calc-crop", "2. 작물 선택", "전체 (선택 또는 예: 잔디 입력)"),
                            searchable_select("calc-pest", "3. 적용 병해충 선택", "전체 (선택 또는 병해충 입력)"),
                            class_name="filter-grid",
                        ),
                        rx.el.div(
                            searchable_select(
                                "calc-pesticide",
                                "4. 최종 농약 선택 (상표명 / 품목명 / 성분명 검색)",
                                "터치하여 목록에서 선택하거나 농약명·성분명 입력",
                            ),
                            rx.el.div(
                                id="calc-match-count",
                                class_name="calc-match-hint",
                            ),
                            class_name="keyword-box",
                        ),
                        class_name="calc-search-panel",
                    ),
                    # 선택된 농약 기준 정보 안내 박스
                    rx.el.div(
                        id="calc-selected-info",
                        class_name="calc-selected-box",
                        style={"display": "none"},
                    ),
                    # [2단계 & 3단계] 살포할 물의 양(L 고정) 및 적용 희석배수(범위 농약만 입력 허용)
                    rx.el.div(
                        rx.el.div(
                            rx.el.label(
                                "2단계. 살포할 물의 양 (L 단위 고정)",
                                html_for="water-input",
                                class_name="field-label",
                            ),
                            rx.el.div(
                                rx.el.input(
                                    id="water-input",
                                    type="number",
                                    step="any",
                                    min="0",
                                    default_value="20",
                                    input_mode="decimal",
                                    class_name="form-control water-unit-input",
                                ),
                                rx.el.span("L (리터)", class_name="unit-fixed-badge"),
                                class_name="water-input-group",
                            ),
                            class_name="filter-item",
                        ),
                        rx.el.div(
                            rx.el.label(
                                "3단계. 적용 희석배수 (범위 등록 농약만 입력 가능)",
                                id="dilution-input-label",
                                html_for="dilution-input",
                                class_name="field-label",
                            ),
                            rx.el.div(
                                rx.el.input(
                                    id="dilution-input",
                                    type="text",
                                    read_only=True,
                                    tab_index=-1,
                                    placeholder="위에서 농약을 선택하면 자동 입력됩니다",
                                    class_name="form-control locked-ratio-input",
                                ),
                                rx.el.span("🔒 고정", id="dilution-lock-badge", class_name="lock-fixed-badge"),
                                class_name="water-input-group",
                            ),
                            rx.el.div(
                                id="dilution-range-hint",
                                class_name="dilution-range-hint",
                                style={"display": "none"},
                            ),
                            class_name="filter-item",
                        ),
                        class_name="calc-input-grid",
                    ),
                    # 자동 계산 결과 출력
                    rx.el.div(
                        rx.el.div("💡 자동 계산 결과", class_name="calc-result-title"),
                        rx.el.div(
                            rx.el.div(
                                rx.el.div("살포할 물의 양", class_name="calc-box-label"),
                                rx.el.div("20.0 L", id="calc-water-main", class_name="calc-box-value"),
                                rx.el.div("리터(L) 단위 고정", id="calc-water-sub", class_name="calc-box-sub"),
                                class_name="calc-box",
                            ),
                            rx.el.div(
                                rx.el.div("필요한 농약 용량 (자동계산)", class_name="calc-box-label"),
                                rx.el.div("-", id="calc-pesticide-val", class_name="calc-box-value highlight"),
                                rx.el.div("농약을 먼저 선택하세요", id="calc-pesticide-sub", class_name="calc-box-sub"),
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
        # 5. 상세 안전사용지침 즉시 팝업 모달
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
    head_components=[
        rx.el.link(rel="manifest", href="/manifest.json"),
        rx.el.link(rel="apple-touch-icon", href="/app_icon.png"),
        rx.el.meta(name="apple-mobile-web-app-capable", content="yes"),
        rx.el.meta(name="mobile-web-app-capable", content="yes"),
        rx.el.meta(name="theme-color", content="#1b4332"),
        rx.script(src="/app.js"),
    ],
)
