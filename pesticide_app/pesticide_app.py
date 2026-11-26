import reflex as rx


def searchable_select(prefix: str, label_text: str, placeholder_text: str) -> rx.Component:
    """검색어 입력 시 일치하는 목록이 자동으로 뜨는 모바일 맞춤형 선택 컴포넌트"""
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
                title="전체로 초기화",
                class_name="combo-clear-btn",
                style={"display": "none"},
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
        rx.el.link(rel="stylesheet", href="/style.css"),
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
                # (1) 상단 검색 필터 박스 (검색형 자동완성 적용)
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
                        searchable_select("use", "1. 용도 선택", "전체 (터치 또는 용도 입력)"),
                        searchable_select("crop", "2. 작물 선택", "전체 (예: 잔디 입력)"),
                        searchable_select("pest", "3. 적용 병해충 선택", "전체 (병해충명 입력)"),
                        class_name="filter-grid",
                    ),
                    rx.el.div(
                        rx.el.label(
                            "4. 상표명 / 품목명 / 성분명 키워드 검색",
                            html_for="keyword-input",
                            class_name="field-label",
                        ),
                        rx.el.input(
                            id="keyword-input",
                            type="search",
                            placeholder="검색어를 입력하세요 (예: 가가방, 수화제, 가스가마이신 등)",
                            class_name="form-control",
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
                    class_name="metric-container",
                ),
                # (3) 검색 결과 목록 & CSV 다운로드 (상단 배치)
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
                    rx.el.div(id="list-notice", class_name="info-banner", style={"display": "none"}),
                    rx.el.div(id="result-list", class_name="result-list"),
                    class_name="card-box",
                ),
                # (4) 상세 안전사용지침 카드 (하단 배치)
                rx.el.div(
                    rx.el.h2("🔎 검색된 농약 상세 안전사용지침", class_name="section-title"),
                    rx.el.div(
                        rx.el.label(
                            "위 목록에서 카드를 터치하거나 아래에서 농약을 선택하면 상세 지침이 표시됩니다:",
                            html_for="detail-select",
                            class_name="field-label",
                        ),
                        rx.el.select(id="detail-select", class_name="form-control"),
                        style={"marginTop": "8px", "marginBottom": "12px"},
                    ),
                    rx.el.div(id="detail-card-container"),
                    id="detail-section",
                    class_name="card-box",
                ),
                id="tab-panel-search",
            ),
            # ==========================================
            # TAB 2: 희석배수 계산기
            # ==========================================
            rx.el.div(
                rx.el.div(
                    rx.el.h2("🧪 희석배수 계산기", class_name="section-title"),
                    rx.el.p(
                        "살포할 물의 양과 희석배수를 입력하면 필요한 농약 용량이 자동으로 계산됩니다.",
                        class_name="sub-caption",
                    ),
                    rx.el.div(
                        rx.el.div(
                            rx.el.div("1. 입력단위 선택", class_name="field-label"),
                            rx.el.div(
                                rx.el.label(
                                    rx.el.input(type="radio", name="unit-type", value="L", default_checked=True),
                                    " 리터 (L)",
                                    class_name="radio-label",
                                ),
                                rx.el.label(
                                    rx.el.input(type="radio", name="unit-type", value="MAL"),
                                    " 말 (1말 = 20L)",
                                    class_name="radio-label",
                                ),
                                class_name="radio-group",
                            ),
                            class_name="filter-item",
                        ),
                        rx.el.div(
                            rx.el.label(
                                "2. 살포할 물의 양 (L)",
                                id="water-input-label",
                                html_for="water-input",
                                class_name="field-label",
                            ),
                            rx.el.input(
                                id="water-input",
                                type="number",
                                step="0.5",
                                min="0.1",
                                value="20",
                                class_name="form-control",
                            ),
                            class_name="filter-item",
                        ),
                        rx.el.div(
                            rx.el.label("3. 희석배수 (배)", html_for="dilution-input", class_name="field-label"),
                            rx.el.input(
                                id="dilution-input",
                                type="number",
                                step="100",
                                min="1",
                                value="1000",
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
                    ),
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
                                rx.el.div("농약 용량 (자동계산)", class_name="calc-box-label"),
                                rx.el.div("20.0 mL (또는 g)", id="calc-pesticide-val", class_name="calc-box-value highlight"),
                                rx.el.div("희석배수 기준 산출량", class_name="calc-box-sub"),
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
        rx.script(src="/app.js"),
        class_name="page-bg",
    )


app = rx.App(enable_state=False)
app.add_page(index, title="골프장 농약 안전사용 도우미")
