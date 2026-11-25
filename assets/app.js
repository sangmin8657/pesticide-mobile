(function () {
  let allData = [];
  let filteredData = [];
  let uniqueDetailRows = [];

  function escapeHtml(val) {
    return String(val ?? "-")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function getUniqueOptions(rows, col) {
    const set = new Set();
    for (const r of rows) {
      const v = r[col];
      if (v && v !== "-") set.add(v);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b, "ko"));
  }

  function populateSelect(selectEl, options, keepValue = false) {
    const prev = selectEl.value;
    selectEl.innerHTML =
      '<option value="전체">전체</option>' +
      options
        .map((opt) => `<option value="${escapeHtml(opt)}">${escapeHtml(opt)}</option>`)
        .join("");
    if (keepValue && options.includes(prev)) {
      selectEl.value = prev;
    } else {
      selectEl.value = "전체";
    }
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
    const crops = new Set();
    const pests = new Set();
    const brands = new Set();

    for (const r of rows) {
      if (r["작물명"]) crops.add(r["작물명"]);
      if (r["적용병해충"]) pests.add(r["적용병해충"]);
      if (r["상표명"]) brands.add(r["상표명"]);
    }

    document.getElementById("metric-total").textContent = `${rows.length.toLocaleString()} 건`;
    document.getElementById("metric-crops").textContent = `${crops.size.toLocaleString()} 개`;
    document.getElementById("metric-pests").textContent = `${pests.size.toLocaleString()} 개`;
    document.getElementById("metric-brands").textContent = `${brands.size.toLocaleString()} 개`;
  }

  function renderList(rows) {
    const listEl = document.getElementById("result-list");
    const noticeEl = document.getElementById("list-notice");
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
    const selectedUse = document.getElementById("use-select").value;
    const selectedCrop = document.getElementById("crop-select").value;
    const selectedPest = document.getElementById("pest-select").value;
    const kw = document.getElementById("keyword-input").value.trim().toLowerCase();

    filteredData = allData.filter((r) => {
      if (selectedUse !== "전체" && r["용도"] !== selectedUse) return false;
      if (selectedCrop !== "전체" && r["작물명"] !== selectedCrop) return false;
      if (selectedPest !== "전체" && r["적용병해충"] !== selectedPest) return false;
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
    const unitEl = document.querySelector('input[name="unit-type"]:checked');
    const unit = unitEl ? unitEl.value : "L";
    const waterVal = parseFloat(document.getElementById("water-input").value) || 0;
    const ratio = parseFloat(document.getElementById("dilution-input").value) || 0;

    const waterMl = unit === "L" ? waterVal * 1000.0 : waterVal * 20.0 * 1000.0;
    const totalL = waterMl / 1000.0;
    const totalMal = totalL / 20.0;
    const pesticideMl = ratio > 0 ? waterMl / ratio : 0;

    document.getElementById("calc-water-main").textContent = `${totalL.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })} L`;
    document.getElementById("calc-water-sub").textContent = `${totalMal.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })} 말`;
    document.getElementById("calc-pesticide-val").textContent = `${pesticideMl.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })} mL (또는 g)`;
  }

  async function initApp() {
    const useSelect = document.getElementById("use-select");
    if (!useSelect || useSelect.dataset.bound === "true") return;
    useSelect.dataset.bound = "true";

    const cropSelect = document.getElementById("crop-select");
    const pestSelect = document.getElementById("pest-select");
    const keywordInput = document.getElementById("keyword-input");
    const detailSelect = document.getElementById("detail-select");

    // 탭 전환 이벤트
    const tabSearchBtn = document.getElementById("tab-btn-search");
    const tabCalcBtn = document.getElementById("tab-btn-calc");
    const panelSearch = document.getElementById("tab-panel-search");
    const panelCalc = document.getElementById("tab-panel-calc");

    tabSearchBtn.addEventListener("click", () => {
      tabSearchBtn.classList.add("active");
      tabCalcBtn.classList.remove("active");
      panelSearch.style.display = "block";
      panelCalc.style.display = "none";
    });

    tabCalcBtn.addEventListener("click", () => {
      tabCalcBtn.classList.add("active");
      tabSearchBtn.classList.remove("active");
      panelCalc.style.display = "block";
      panelSearch.style.display = "none";
    });

    // 데이터 로딩
    try {
      const res = await fetch("/pesticide_data.json");
      allData = await res.json();
      populateSelect(useSelect, getUniqueOptions(allData, "용도"));
      populateSelect(cropSelect, getUniqueOptions(allData, "작물명"));
      populateSelect(pestSelect, getUniqueOptions(allData, "적용병해충"));
      applyFilters();
    } catch (e) {
      document.getElementById("metric-total").textContent = "오류";
      console.error("데이터 로딩 실패:", e);
    }

    // 3단 연동 필터 이벤트
    useSelect.addEventListener("change", () => {
      const step1 =
        useSelect.value === "전체"
          ? allData
          : allData.filter((r) => r["용도"] === useSelect.value);
      populateSelect(cropSelect, getUniqueOptions(step1, "작물명"));
      populateSelect(pestSelect, getUniqueOptions(step1, "적용병해충"));
      applyFilters();
    });

    cropSelect.addEventListener("change", () => {
      const step1 =
        useSelect.value === "전체"
          ? allData
          : allData.filter((r) => r["용도"] === useSelect.value);
      const step2 =
        cropSelect.value === "전체"
          ? step1
          : step1.filter((r) => r["작물명"] === cropSelect.value);
      populateSelect(pestSelect, getUniqueOptions(step2, "적용병해충"));
      applyFilters();
    });

    pestSelect.addEventListener("change", applyFilters);
    keywordInput.addEventListener("input", applyFilters);

    document.getElementById("reset-btn").addEventListener("click", () => {
      populateSelect(useSelect, getUniqueOptions(allData, "용도"));
      populateSelect(cropSelect, getUniqueOptions(allData, "작물명"));
      populateSelect(pestSelect, getUniqueOptions(allData, "적용병해충"));
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

    document.getElementById("water-input").addEventListener("input", updateCalculator);
    document.getElementById("dilution-input").addEventListener("input", updateCalculator);
    document.querySelectorAll(".preset-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        document.getElementById("dilution-input").value = btn.dataset.ratio;
        updateCalculator();
      });
    });

    updateCalculator();
  }

  const timer = setInterval(() => {
    if (document.getElementById("use-select")) {
      initApp();
      clearInterval(timer);
    }
  }, 100);
})();
