(function () {
  if (window.__PESTICIDE_APP_BOOTED__) return;
  window.__PESTICIDE_APP_BOOTED__ = true;

  let allData = [];
  let filteredData = [];
  let uniqueDetailRows = [];
  let isFetching = false;
  let fetchErrorMsg = "";

  // 현재 선택 상태 유지 (React 재렌더링 시에도 보존)
  const state = {
    use: "전체",
    crop: "전체",
    pest: "전체",
    keyword: "",
    activeTab: "search",
  };

  function escapeHtml(val) {
    return String(val ?? "-")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function highlightMatch(text, query) {
    const raw = String(text ?? "");
    const q = query.trim();
    if (!q) return escapeHtml(raw);
    const idx = raw.toLowerCase().indexOf(q.toLowerCase());
    if (idx === -1) return escapeHtml(raw);
    return (
      escapeHtml(raw.slice(0, idx)) +
      `<span class="combo-highlight">${escapeHtml(raw.slice(idx, idx + q.length))}</span>` +
      escapeHtml(raw.slice(idx + q.length))
    );
  }

  function getUniqueOptions(rows, col) {
    const set = new Set();
    for (const r of rows) {
      const v = r[col];
      if (v && v !== "-") set.add(v);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b, "ko"));
  }

  function closeAllDropdowns(exceptPrefix = "") {
    ["use", "crop", "pest"].forEach((p) => {
      if (p !== exceptPrefix) {
        const dd = document.getElementById(`${p}-dropdown`);
        if (dd) dd.style.display = "none";
      }
    });
  }

  // 목록 선택(▼) + 검색어 자동완성을 동시에 지원하는 콤보박스
  function bindSearchableSelect(prefix, getOptionsFn, onSelectCallback) {
    const wrapper = document.getElementById(`${prefix}-wrapper`);
    const input = document.getElementById(`${prefix}-input`);
    const clearBtn = document.getElementById(`${prefix}-clear`);
    const toggleBtn = document.getElementById(`${prefix}-toggle`);
    const dropdown = document.getElementById(`${prefix}-dropdown`);

    function updateClearButton() {
      clearBtn.style.display =
        state[prefix] !== "전체" || input.value.trim() !== "" ? "flex" : "none";
    }

    // 기존 상태 복원
    input.value = state[prefix] === "전체" ? "" : state[prefix];
    updateClearButton();

    function renderDropdown(query = "") {
      const options = getOptionsFn();
      const q = query.trim().toLowerCase();
      const matched = q
        ? options.filter((opt) => opt.toLowerCase().includes(q))
        : options;

      const headerText = q
        ? `검색 결과 ${matched.length.toLocaleString()}개 (터치하여 선택)`
        : `전체 목록 ${options.length.toLocaleString()}개 (터치 선택 또는 검색어 입력)`;

      let html = `<div class="combo-header">${headerText}</div>`;
      html += `<div class="combo-option ${state[prefix] === "전체" ? "selected" : ""}" data-val="전체">전체</div>`;

      if (matched.length === 0) {
        html += `<div class="combo-empty">'${escapeHtml(query)}'와 일치하는 항목이 없습니다</div>`;
      } else {
        html += matched
          .map(
            (opt) =>
              `<div class="combo-option ${state[prefix] === opt ? "selected" : ""}" data-val="${escapeHtml(opt)}">${highlightMatch(opt, query)}</div>`
          )
          .join("");
      }

      dropdown.innerHTML = html;

      dropdown.querySelectorAll(".combo-option").forEach((el) => {
        el.addEventListener("click", (e) => {
          e.stopPropagation();
          const val = el.dataset.val;
          state[prefix] = val;
          input.value = val === "전체" ? "" : val;
          dropdown.style.display = "none";
          updateClearButton();
          onSelectCallback(val);
        });
      });
    }

    toggleBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      const isOpen = dropdown.style.display === "block";
      closeAllDropdowns(prefix);
      if (isOpen) {
        dropdown.style.display = "none";
      } else {
        renderDropdown("");
        dropdown.style.display = "block";
        const activeEl = dropdown.querySelector(".combo-option.selected");
        if (activeEl) activeEl.scrollIntoView({ block: "nearest" });
      }
    });

    input.addEventListener("click", (e) => {
      e.stopPropagation();
      closeAllDropdowns(prefix);
      renderDropdown("");
      dropdown.style.display = "block";
      if (input.value) {
        input.select();
      }
    });

    input.addEventListener("input", () => {
      const options = getOptionsFn();
      const trimmed = input.value.trim();
      updateClearButton();
      renderDropdown(trimmed);
      dropdown.style.display = "block";

      if (trimmed === "" || trimmed === "전체") {
        if (state[prefix] !== "전체") {
          state[prefix] = "전체";
          onSelectCallback("전체");
        }
      } else {
        const exact = options.find((opt) => opt.toLowerCase() === trimmed.toLowerCase());
        if (exact && state[prefix] !== exact) {
          state[prefix] = exact;
          onSelectCallback(exact);
        }
      }
    });

    clearBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      state[prefix] = "전체";
      input.value = "";
      dropdown.style.display = "none";
      updateClearButton();
      onSelectCallback("전체");
    });

    document.addEventListener("click", (e) => {
      if (!wrapper.contains(e.target)) {
        dropdown.style.display = "none";
        input.value = state[prefix] === "전체" ? "" : state[prefix];
        updateClearButton();
      }
    });
  }

  function renderDetailCard(row) {
    const container = document.getElementById("detail-card-container");
    if (!container) return;

    if (!row) {
      container.innerHTML =
        '<div class="info-banner" style="margin:0;">검색 조건에 일치하는 농약이 없습니다.</div>';
      return;
    }

    container.innerHTML = `
      <div class="detail-card">
        <div class="detail-card-title">📌 [${escapeHtml(row["작물명"])}] ${escapeHtml(row["상표명"])} (${escapeHtml(row["품목명"])})</div>
        <div class="detail-grid">
          <div>
            <div><strong>등록번호:</strong> ${escapeHtml(row["등록번호"])}</div>
            <div><strong>구분 / 용도:</strong> ${escapeHtml(row["구분"])} / ${escapeHtml(row["용도"])}</div>
            <div><strong>품목명:</strong> ${escapeHtml(row["품목명"])}</div>
            <div><strong>성분(일반명):</strong> ${escapeHtml(row["일반명"])} (${escapeHtml(row["주성분함량"])})</div>
            <div><strong>제조사:</strong> ${escapeHtml(row["회사명"])}</div>
          </div>
          <div>
            <div><strong>적용 작물:</strong> ${escapeHtml(row["작물명"])}</div>
            <div><strong>적용 병해충:</strong> ${escapeHtml(row["적용병해충"])}</div>
            <div><strong>작용기작:</strong> ${escapeHtml(row["작용기작"])}</div>
            <div><strong>제형:</strong> ${escapeHtml(row["제형"])}</div>
            <div><strong>등록일자:</strong> ${escapeHtml(row["등록일"])}</div>
          </div>
          <div>
            <div><strong>희석배수:</strong> <span class="text-blue">${escapeHtml(row["희석배수"])}</span></div>
            <div><strong>사용량:</strong> ${escapeHtml(row["사용량"])}</div>
            <div><strong>사용적기:</strong> ${escapeHtml(row["사용적기"])}</div>
            <div><strong>안전사용시기:</strong> <span class="text-red">${escapeHtml(row["안전사용시기"])}</span></div>
            <div><strong>안전사용횟수:</strong> <span class="text-red">${escapeHtml(row["안전사용횟수"])}</span></div>
            <div><strong>독성:</strong> 인축(${escapeHtml(row["인축독성"])}) / 어독성(${escapeHtml(row["어독성"])})</div>
          </div>
        </div>
        <div class="usage-method-box">
          💡 <strong>사용방법:</strong> ${escapeHtml(row["사용방법"])}
        </div>
      </div>
    `;
  }

  function updateDetailSelector(rows) {
    const detailSelect = document.getElementById("detail-select");
    if (!detailSelect) return;

    const seen = new Set();
    uniqueDetailRows = [];

    for (const r of rows) {
      const label = `[${r["상표명"]}] ${r["작물명"]} - ${r["적용병해충"]} (${r["회사명"]})`;
      if (!seen.has(label)) {
        seen.add(label);
        uniqueDetailRows.push({ label, row: r });
        if (uniqueDetailRows.length >= 500) break;
      }
    }

    if (uniqueDetailRows.length === 0) {
      detailSelect.innerHTML = '<option value="">일치하는 농약 없음</option>';
      renderDetailCard(null);
      return;
    }

    detailSelect.innerHTML = uniqueDetailRows
      .map((item, idx) => `<option value="${idx}">${escapeHtml(item.label)}</option>`)
      .join("");
    detailSelect.value = "0";
    renderDetailCard(uniqueDetailRows[0].row);
  }

  function renderMetrics(rows) {
    const totalEl = document.getElementById("metric-total");
    if (!totalEl) return;

    const crops = new Set();
    const pests = new Set();
    const brands = new Set();

    for (const r of rows) {
      if (r["작물명"]) crops.add(r["작물명"]);
      if (r["적용병해충"]) pests.add(r["적용병해충"]);
      if (r["상표명"]) brands.add(r["상표명"]);
    }

    totalEl.textContent = `${rows.length.toLocaleString()} 건`;
    document.getElementById("metric-crops").textContent = `${crops.size.toLocaleString()} 개`;
    document.getElementById("metric-pests").textContent = `${pests.size.toLocaleString()} 개`;
    document.getElementById("metric-brands").textContent = `${brands.size.toLocaleString()} 개`;
  }

  function renderList(rows) {
    const listEl = document.getElementById("result-list");
    const noticeEl = document.getElementById("list-notice");
    if (!listEl || !noticeEl) return;

    const MAX_DISPLAY = 200;

    if (rows.length > MAX_DISPLAY) {
      noticeEl.style.display = "block";
      noticeEl.innerHTML = `💡 검색 결과가 총 <strong>${rows.length.toLocaleString()}건</strong>으로 많아 상위 <strong>${MAX_DISPLAY}건</strong>만 표시합니다. 상단에서 작물이나 병해충을 선택하시면 상세한 조회가 가능합니다.`;
    } else {
      noticeEl.style.display = "none";
    }

    if (rows.length === 0) {
      listEl.innerHTML =
        '<div style="padding:24px;text-align:center;color:#94a3b8;">검색 조건에 일치하는 농약이 없습니다.</div>';
      return;
    }

    const visible = rows.slice(0, MAX_DISPLAY);
    listEl.innerHTML = visible
      .map(
        (r, idx) => `
        <div class="pesticide-item-card" data-row-idx="${idx}">
          <div class="item-card-top">
            <div class="item-brand">${escapeHtml(r["상표명"])} <span style="font-weight:400;font-size:13px;color:#64748b;">(${escapeHtml(r["품목명"])})</span></div>
            <span class="item-badge">${escapeHtml(r["용도"])}</span>
          </div>
          <div class="item-meta">
            <div><strong>작물 / 병해충:</strong> ${escapeHtml(r["작물명"])} · ${escapeHtml(r["적용병해충"])}</div>
            <div><strong>희석배수 / 사용량:</strong> <span class="text-blue">${escapeHtml(r["희석배수"])}</span> · ${escapeHtml(r["사용량"])}</div>
            <div><strong>안전사용:</strong> <span class="text-red">${escapeHtml(r["안전사용시기"])}</span> / <span class="text-red">${escapeHtml(r["안전사용횟수"])}</span> · ${escapeHtml(r["회사명"])}</div>
          </div>
        </div>
      `
      )
      .join("");

    listEl.querySelectorAll(".pesticide-item-card").forEach((card) => {
      card.addEventListener("click", () => {
        const idx = Number(card.dataset.rowIdx);
        const targetRow = visible[idx];
        if (!targetRow) return;
        renderDetailCard(targetRow);
        const targetLabel = `[${targetRow["상표명"]}] ${targetRow["작물명"]} - ${targetRow["적용병해충"]} (${targetRow["회사명"]})`;
        const foundIdx = uniqueDetailRows.findIndex((item) => item.label === targetLabel);
        if (foundIdx >= 0) {
          document.getElementById("detail-select").value = String(foundIdx);
        }
        document.getElementById("detail-section").scrollIntoView({ behavior: "smooth", block: "start" });
      });
    });
  }

  function applyFilters() {
    if (allData.length === 0) return;

    const kwInput = document.getElementById("keyword-input");
    if (kwInput) state.keyword = kwInput.value;

    const kw = state.keyword.trim().toLowerCase();

    filteredData = allData.filter((r) => {
      if (state.use !== "전체" && r["용도"] !== state.use) return false;
      if (state.crop !== "전체" && r["작물명"] !== state.crop) return false;
      if (state.pest !== "전체" && r["적용병해충"] !== state.pest) return false;
      if (kw) {
        const match =
          String(r["상표명"] || "").toLowerCase().includes(kw) ||
          String(r["품목명"] || "").toLowerCase().includes(kw) ||
          String(r["일반명"] || "").toLowerCase().includes(kw);
        if (!match) return false;
      }
      return true;
    });

    renderMetrics(filteredData);
    updateDetailSelector(filteredData);
    renderList(filteredData);
  }

  function downloadCsv() {
    if (filteredData.length === 0) {
      alert("다운로드할 검색 결과가 없습니다.");
      return;
    }
    const headers = Object.keys(filteredData[0]);
    const csvLines = [
      headers.join(","),
      ...filteredData.map((row) =>
        headers
          .map((h) => `"${String(row[h] ?? "").replace(/"/g, '""')}"`)
          .join(",")
      ),
    ];
    const blob = new Blob(["\uFEFF" + csvLines.join("\n")], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "농약_검색결과.csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function updateCalculator() {
    const waterEl = document.getElementById("water-input");
    const dilutionEl = document.getElementById("dilution-input");
    if (!waterEl || !dilutionEl) return;

    const unitEl = document.querySelector('input[name="unit-type"]:checked');
    const unit = unitEl ? unitEl.value : "L";
    const waterVal = parseFloat(waterEl.value) || 0;
    const ratio = parseFloat(dilutionEl.value) || 0;

    const waterMl = unit === "L" ? waterVal * 1000.0 : waterVal * 20.0 * 1000.0;
    const totalL = waterMl / 1000.0;
    const totalMal = totalL / 20.0;
    const pesticideMl = ratio > 0 ? waterMl / ratio : 0;

    document.getElementById("calc-water-main").textContent = `${totalL.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })} L`;
    document.getElementById("calc-water-sub").textContent = `${totalMal.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })} 말`;
    document.getElementById("calc-pesticide-val").textContent = `${pesticideMl.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })} mL (또는 g)`;
  }

  async function loadDataOnce() {
    if (allData.length > 0 || isFetching) return;
    isFetching = true;

    try {
      const metaRes = await fetch("/pesticide_meta.json");
      if (!metaRes.ok) throw new Error(`메타 데이터 응답 오류 (${metaRes.status})`);
      const meta = await metaRes.json();
      const cols = meta.columns;

      const partArrays = await Promise.all(
        meta.chunks.map((file) =>
          fetch("/" + file).then((r) => {
            if (!r.ok) throw new Error(`분할 데이터 오류 (${file}: ${r.status})`);
            return r.json();
          })
        )
      );

      const loaded = [];
      for (const part of partArrays) {
        for (const arr of part) {
          const obj = {};
          for (let i = 0; i < cols.length; i++) {
            obj[cols[i]] = arr[i];
          }
          loaded.push(obj);
        }
      }

      allData = loaded;
      applyFilters();
    } catch (e) {
      fetchErrorMsg = e.message || "데이터 로딩 실패";
      const totalEl = document.getElementById("metric-total");
      const listEl = document.getElementById("result-list");
      if (totalEl) totalEl.textContent = "오류";
      if (listEl) {
        listEl.innerHTML = `<div style="padding:20px;text-align:center;color:#dc2626;">데이터를 불러오지 못했습니다: ${escapeHtml(fetchErrorMsg)}</div>`;
      }
      console.error("데이터 로딩 실패:", e);
    } finally {
      isFetching = false;
    }
  }

  function bindDomElements() {
    const useInput = document.getElementById("use-input");
    if (!useInput || useInput.dataset.bound === "true") return;
    useInput.dataset.bound = "true";

    const keywordInput = document.getElementById("keyword-input");
    const searchSubmitBtn = document.getElementById("search-submit-btn");
    const detailSelect = document.getElementById("detail-select");

    if (keywordInput && state.keyword) {
      keywordInput.value = state.keyword;
    }

    // 3단 연동 콤보박스 바인딩
    bindSearchableSelect(
      "use",
      () => getUniqueOptions(allData, "용도"),
      (val) => {
        const step1 = val === "전체" ? allData : allData.filter((r) => r["용도"] === val);
        const validCrops = getUniqueOptions(step1, "작물명");
        if (state.crop !== "전체" && !validCrops.includes(state.crop)) {
          state.crop = "전체";
          const cropInput = document.getElementById("crop-input");
          if (cropInput) cropInput.value = "";
        }
        const step2 = state.crop === "전체" ? step1 : step1.filter((r) => r["작물명"] === state.crop);
        const validPests = getUniqueOptions(step2, "적용병해충");
        if (state.pest !== "전체" && !validPests.includes(state.pest)) {
          state.pest = "전체";
          const pestInput = document.getElementById("pest-input");
          if (pestInput) pestInput.value = "";
        }
        applyFilters();
      }
    );

    bindSearchableSelect(
      "crop",
      () => {
        const step1 = state.use === "전체" ? allData : allData.filter((r) => r["용도"] === state.use);
        return getUniqueOptions(step1, "작물명");
      },
      (val) => {
        const step1 = state.use === "전체" ? allData : allData.filter((r) => r["용도"] === state.use);
        const step2 = val === "전체" ? step1 : step1.filter((r) => r["작물명"] === val);
        const validPests = getUniqueOptions(step2, "적용병해충");
        if (state.pest !== "전체" && !validPests.includes(state.pest)) {
          state.pest = "전체";
          const pestInput = document.getElementById("pest-input");
          if (pestInput) pestInput.value = "";
        }
        applyFilters();
      }
    );

    bindSearchableSelect(
      "pest",
      () => {
        const step1 = state.use === "전체" ? allData : allData.filter((r) => r["용도"] === state.use);
        const step2 = state.crop === "전체" ? step1 : step1.filter((r) => r["작물명"] === state.crop);
        return getUniqueOptions(step2, "적용병해충");
      },
      () => {
        applyFilters();
      }
    );

    // 탭 전환 이벤트
    const tabSearchBtn = document.getElementById("tab-btn-search");
    const tabCalcBtn = document.getElementById("tab-btn-calc");
    const panelSearch = document.getElementById("tab-panel-search");
    const panelCalc = document.getElementById("tab-panel-calc");

    function switchTab(tabName) {
      state.activeTab = tabName;
      if (tabName === "search") {
        tabSearchBtn.classList.add("active");
        tabCalcBtn.classList.remove("active");
        panelSearch.style.display = "block";
        panelCalc.style.display = "none";
      } else {
        tabCalcBtn.classList.add("active");
        tabSearchBtn.classList.remove("active");
        panelCalc.style.display = "block";
        panelSearch.style.display = "none";
      }
    }

    switchTab(state.activeTab);
    tabSearchBtn.addEventListener("click", () => switchTab("search"));
    tabCalcBtn.addEventListener("click", () => switchTab("calc"));

    // 키워드 입력 실시간 반영 + 검색 버튼/엔터키 실행
    function executeKeywordSearch(scrollToResults = false) {
      applyFilters();
      if (scrollToResults) {
        keywordInput.blur();
        const metricEl = document.getElementById("metric-section");
        if (metricEl) metricEl.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }

    keywordInput.addEventListener("input", () => executeKeywordSearch(false));
    keywordInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        executeKeywordSearch(true);
      }
    });
    if (searchSubmitBtn) {
      searchSubmitBtn.addEventListener("click", () => executeKeywordSearch(true));
    }

    // 조건 초기화 버튼
    document.getElementById("reset-btn").addEventListener("click", () => {
      state.use = "전체";
      state.crop = "전체";
      state.pest = "전체";
      state.keyword = "";
      ["use", "crop", "pest"].forEach((p) => {
        const inp = document.getElementById(`${p}-input`);
        const clr = document.getElementById(`${p}-clear`);
        const dd = document.getElementById(`${p}-dropdown`);
        if (inp) inp.value = "";
        if (clr) clr.style.display = "none";
        if (dd) dd.style.display = "none";
      });
      keywordInput.value = "";
      applyFilters();
    });

    detailSelect.addEventListener("change", () => {
      const idx = Number(detailSelect.value);
      if (uniqueDetailRows[idx]) {
        renderDetailCard(uniqueDetailRows[idx].row);
      }
    });

    document.getElementById("download-csv-btn").addEventListener("click", downloadCsv);

    // 희석배수 계산기 이벤트
    document.querySelectorAll('input[name="unit-type"]').forEach((radio) => {
      radio.addEventListener("change", (e) => {
        const label = document.getElementById("water-input-label");
        const input = document.getElementById("water-input");
        if (e.target.value === "L") {
          label.textContent = "2. 살포할 물의 양 (L)";
          input.value = "20";
        } else {
          label.textContent = "2. 살포할 물의 양 (말)";
          input.value = "1";
        }
        updateCalculator();
      });
    });

    const waterInput = document.getElementById("water-input");
    const dilutionInput = document.getElementById("dilution-input");
    waterInput.addEventListener("input", updateCalculator);
    waterInput.addEventListener("change", updateCalculator);
    dilutionInput.addEventListener("input", updateCalculator);
    dilutionInput.addEventListener("change", updateCalculator);

    document.querySelectorAll(".preset-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        dilutionInput.value = btn.dataset.ratio;
        updateCalculator();
      });
    });

    updateCalculator();

    // 이미 데이터가 로드된 상태(React 재렌더링 직후)라면 즉시 화면 갱신
    if (allData.length > 0) {
      applyFilters();
    } else if (fetchErrorMsg) {
      document.getElementById("metric-total").textContent = "오류";
    } else {
      loadDataOnce();
    }
  }

  // React Hydration 이후에도 DOM 요소가 재생성되면 자동으로 재연결
  setInterval(bindDomElements, 250);
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bindDomElements);
  } else {
    bindDomElements();
  }
})();
