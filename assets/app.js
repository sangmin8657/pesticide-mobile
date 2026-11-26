(function () {
  if (window.__PESTICIDE_APP_BOOTED__) return;
  window.__PESTICIDE_APP_BOOTED__ = true;

  let allData = [];
  let filteredData = [];
  let isFetching = false;
  let fetchErrorMsg = "";

  // 현재 선택 상태 유지 (React 재렌더링 시에도 보존)
  const state = {
    use: "전체",
    crop: "전체",
    pest: "전체",
    keyword: "",
    activeTab: "search",
    calcCrop: "전체",
    calcPesticideLabel: "",
    calcSelectedRow: null,
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

  // 희석배수 문자열(예: "1,000배", "500~1,000배", "1000")에서 숫자 배열 추출
  function parseDilutionRatios(rawStr) {
    const s = String(rawStr ?? "").trim();
    if (!s || s === "-" || s.includes("원액") || s.includes("해당없음")) {
      return [];
    }
    const cleaned = s.replace(/,/g, "");
    const matches = cleaned.match(/\d+(\.\d+)?/g);
    if (!matches) return [];
    return matches.map(Number).filter((n) => n > 0);
  }

  function closeAllDropdowns(exceptPrefix = "") {
    ["use", "crop", "pest", "calc-crop", "calc-pesticide"].forEach((p) => {
      if (p !== exceptPrefix) {
        const dd = document.getElementById(`${p}-dropdown`);
        const inp = document.getElementById(`${p}-input`);
        if (dd && dd.style.display === "block") {
          dd.style.display = "none";
          if (inp) {
            if (p === "calc-pesticide") {
              inp.value = state.calcPesticideLabel || "";
            } else {
              const key = p === "calc-crop" ? "calcCrop" : p;
              inp.value = state[key] === "전체" ? "" : state[key];
            }
          }
        }
      }
    });
  }

  // 바깥 영역 클릭 시 열려있는 콤보박스 드롭다운 닫기
  document.addEventListener("click", (e) => {
    if (!e.target.closest(".combo-wrapper")) {
      closeAllDropdowns("");
    }
  });

  // ESC 키로 상세 팝업 모달 닫기
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      closeDetailModal();
    }
  });

  // 목록 선택(▼) + 검색어 자동완성을 동시에 지원하는 콤보박스
  function bindSearchableSelect(prefix, getOptionsFn, onSelectCallback) {
    const input = document.getElementById(`${prefix}-input`);
    const clearBtn = document.getElementById(`${prefix}-clear`);
    const toggleBtn = document.getElementById(`${prefix}-toggle`);
    const dropdown = document.getElementById(`${prefix}-dropdown`);

    const stateKey = prefix === "calc-crop" ? "calcCrop" : prefix;

    function updateClearButton() {
      clearBtn.style.display =
        state[stateKey] !== "전체" || input.value.trim() !== "" ? "flex" : "none";
    }

    input.value = state[stateKey] === "전체" ? "" : state[stateKey];
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
      html += `<div class="combo-option ${state[stateKey] === "전체" ? "selected" : ""}" data-val="전체">전체</div>`;

      if (matched.length === 0) {
        html += `<div class="combo-empty">'${escapeHtml(query)}'와 일치하는 항목이 없습니다</div>`;
      } else {
        html += matched
          .slice(0, 200)
          .map(
            (opt) =>
              `<div class="combo-option ${state[stateKey] === opt ? "selected" : ""}" data-val="${escapeHtml(opt)}">${highlightMatch(opt, query)}</div>`
          )
          .join("");
      }

      dropdown.innerHTML = html;

      dropdown.querySelectorAll(".combo-option").forEach((el) => {
        el.addEventListener("click", (e) => {
          e.stopPropagation();
          const val = el.dataset.val;
          state[stateKey] = val;
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
        if (state[stateKey] !== "전체") {
          state[stateKey] = "전체";
          onSelectCallback("전체");
        }
      } else {
        const exact = options.find((opt) => opt.toLowerCase() === trimmed.toLowerCase());
        if (exact && state[stateKey] !== exact) {
          state[stateKey] = exact;
          onSelectCallback(exact);
        }
      }
    });

    clearBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      state[stateKey] = "전체";
      input.value = "";
      dropdown.style.display = "none";
      updateClearButton();
      onSelectCallback("전체");
    });
  }

  // 계산기 탭 전용: 농약(상표명/품목명/병해충) 검색 선택기
  function bindCalcPesticideSelect() {
    const prefix = "calc-pesticide";
    const input = document.getElementById(`${prefix}-input`);
    const clearBtn = document.getElementById(`${prefix}-clear`);
    const toggleBtn = document.getElementById(`${prefix}-toggle`);
    const dropdown = document.getElementById(`${prefix}-dropdown`);

    function updateClearButton() {
      clearBtn.style.display =
        state.calcSelectedRow || input.value.trim() !== "" ? "flex" : "none";
    }

    input.value = state.calcPesticideLabel || "";
    updateClearButton();

    function getCandidateRows() {
      if (state.calcCrop && state.calcCrop !== "전체") {
        return allData.filter((r) => r["작물명"] === state.calcCrop);
      }
      return allData;
    }

    function renderDropdown(query = "") {
      const baseRows = getCandidateRows();
      const q = query.trim().toLowerCase();

      const matched = [];
      const seen = new Set();

      for (const r of baseRows) {
        if (q) {
          const hit =
            String(r["상표명"] || "").toLowerCase().includes(q) ||
            String(r["품목명"] || "").toLowerCase().includes(q) ||
            String(r["적용병해충"] || "").toLowerCase().includes(q) ||
            String(r["일반명"] || "").toLowerCase().includes(q) ||
            String(r["작물명"] || "").toLowerCase().includes(q);
          if (!hit) continue;
        }
        const key = `${r["상표명"]}|${r["작물명"]}|${r["적용병해충"]}|${r["희석배수"]}`;
        if (!seen.has(key)) {
          seen.add(key);
          matched.push(r);
          if (matched.length >= 150) break;
        }
      }

      const scopeLabel = state.calcCrop !== "전체" ? `[${state.calcCrop}] ` : "";
      const headerText = q
        ? `${scopeLabel}'${escapeHtml(query)}' 검색 결과 ${matched.length}건${matched.length === 150 ? " (상위 150건)" : ""}`
        : `${scopeLabel}농약 목록 (상위 ${matched.length}건 · 농약명 또는 병해충 입력)`;

      let html = `<div class="combo-header">${headerText}</div>`;

      if (matched.length === 0) {
        html += `<div class="combo-empty">일치하는 농약이 없습니다. 다른 검색어를 입력하세요.</div>`;
      } else {
        html += matched
          .map((r, idx) => {
            const titleText = `[${r["상표명"]}] ${r["작물명"]} · ${r["적용병해충"]}`;
            const subText = `품목: ${r["품목명"]} | 기준 희석배수: ${r["희석배수"]} | 사용량: ${r["사용량"]}`;
            const isSelected =
              state.calcSelectedRow &&
              state.calcSelectedRow["상표명"] === r["상표명"] &&
              state.calcSelectedRow["작물명"] === r["작물명"] &&
              state.calcSelectedRow["적용병해충"] === r["적용병해충"];

            return `
              <div class="combo-option ${isSelected ? "selected" : ""}" data-idx="${idx}">
                <div>${highlightMatch(titleText, query)}</div>
                <span class="combo-subtext">${highlightMatch(subText, query)}</span>
              </div>
            `;
          })
          .join("");
      }

      dropdown.innerHTML = html;

      dropdown.querySelectorAll(".combo-option").forEach((el) => {
        el.addEventListener("click", (e) => {
          e.stopPropagation();
          const idx = Number(el.dataset.idx);
          const chosenRow = matched[idx];
          if (!chosenRow) return;
          applySelectedPesticideToCalc(chosenRow);
          dropdown.style.display = "none";
          updateClearButton();
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
      updateClearButton();
      renderDropdown(input.value);
      dropdown.style.display = "block";
    });

    clearBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      state.calcSelectedRow = null;
      state.calcPesticideLabel = "";
      input.value = "";
      dropdown.style.display = "none";
      updateClearButton();
      renderCalcSelectedInfo();
    });
  }

  // 선택한 농약의 희석배수를 계산기에 자동 적용
  function applySelectedPesticideToCalc(row) {
    state.calcSelectedRow = row;
    const label = `[${row["상표명"]}] ${row["작물명"]} - ${row["적용병해충"]} (${row["희석배수"]})`;
    state.calcPesticideLabel = label;

    const inputEl = document.getElementById("calc-pesticide-input");
    const clearBtn = document.getElementById("calc-pesticide-clear");
    if (inputEl) inputEl.value = label;
    if (clearBtn) clearBtn.style.display = "flex";

    const ratios = parseDilutionRatios(row["희석배수"]);
    const dilutionInput = document.getElementById("dilution-input");
    if (ratios.length > 0 && dilutionInput) {
      dilutionInput.value = String(ratios[0]);
    }

    renderCalcSelectedInfo();
    updateCalculator();
  }

  // 선택된 농약 기준 희석배수 안내 카드 렌더링
  function renderCalcSelectedInfo() {
    const infoBox = document.getElementById("calc-selected-info");
    const guideBox = document.getElementById("calc-usage-guide");
    if (!infoBox) return;

    const row = state.calcSelectedRow;
    if (!row) {
      infoBox.style.display = "none";
      if (guideBox) {
        guideBox.innerHTML = `
          <strong>📌 사용 안내</strong>
          <ul>
            <li>액체 농약(액상수화제, 유제 등)은 1mL ≒ 1g으로 간주하여 계산됩니다.</li>
            <li>약제를 먼저 소량의 물에 완전히 희석한 후 전체 물통에 섞으면 균일하게 혼합됩니다.</li>
          </ul>
        `;
      }
      return;
    }

    const ratios = parseDilutionRatios(row["희석배수"]);
    let statusHtml = "";
    let rangeButtonsHtml = "";

    if (ratios.length === 0) {
      statusHtml = `<div style="color:#dc2626;font-weight:700;margin-top:4px;">⚠️ 이 약제는 희석배수 숫자가 없는 제품(입제·원액 등)입니다. 아래 기준 사용량을 확인하거나 배수를 직접 입력하세요.</div>`;
    } else if (ratios.length > 1) {
      statusHtml = `<div style="color:#15803d;font-weight:700;margin-top:4px;">✅ 기준 희석배수 범위(${escapeHtml(row["희석배수"])}) 중 <strong>${ratios[0].toLocaleString()}배</strong>가 자동 입력되었습니다.</div>`;
      rangeButtonsHtml = `
        <div class="calc-range-btns">
          ${ratios
            .map(
              (rVal) =>
                `<button type="button" class="calc-range-btn" data-set-ratio="${rVal}">${rVal.toLocaleString()}배 적용하기</button>`
            )
            .join("")}
        </div>
      `;
    } else {
      statusHtml = `<div style="color:#15803d;font-weight:700;margin-top:4px;">✅ 기준 희석배수 <strong>${ratios[0].toLocaleString()}배</strong>가 자동 입력되었습니다.</div>`;
    }

    infoBox.style.display = "block";
    infoBox.innerHTML = `
      <div><strong>선택된 농약:</strong> [${escapeHtml(row["작물명"])}] <strong>${escapeHtml(row["상표명"])}</strong> (${escapeHtml(row["품목명"])}) · ${escapeHtml(row["적용병해충"])}</div>
      <div><strong>등록 기준 희석배수:</strong> <span class="text-blue">${escapeHtml(row["희석배수"])}</span> &nbsp;|&nbsp; <strong>기준 사용량:</strong> ${escapeHtml(row["사용량"])}</div>
      ${statusHtml}
      ${rangeButtonsHtml}
    `;

    infoBox.querySelectorAll(".calc-range-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const dilutionInput = document.getElementById("dilution-input");
        if (dilutionInput) {
          dilutionInput.value = btn.dataset.setRatio;
          updateCalculator();
        }
      });
    });

    if (guideBox) {
      guideBox.innerHTML = `
        <strong>📌 [${escapeHtml(row["상표명"])}] 현장 살포 및 안전사용 참고</strong>
        <ul>
          <li><strong>기준 사용량:</strong> ${escapeHtml(row["사용량"])} / <strong>사용적기:</strong> ${escapeHtml(row["사용적기"])}</li>
          <li><strong>안전사용기준:</strong> ${escapeHtml(row["안전사용시기"])} / ${escapeHtml(row["안전사용횟수"])}</li>
          <li>액체 농약(액상수화제, 유제 등)은 <strong>1mL ≒ 1g</strong>으로 간주하며, 소량의 물에 먼저 녹인 뒤 전체 물통에 희석하세요.</li>
        </ul>
      `;
    }
  }

  // 상세 안전사용지침 모달 열기/닫기
  function closeDetailModal() {
    const overlay = document.getElementById("detail-modal-overlay");
    if (overlay) {
      overlay.style.display = "none";
      document.body.style.overflow = "";
    }
  }

  function openDetailModal(row) {
    const overlay = document.getElementById("detail-modal-overlay");
    const body = document.getElementById("detail-modal-body");
    if (!overlay || !body || !row) return;

    body.innerHTML = `
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
        <div class="detail-calc-action">
          <button type="button" id="modal-calc-btn" class="detail-calc-btn">
            🧪 이 농약(${escapeHtml(row["희석배수"])})으로 희석배수 계산하기
          </button>
        </div>
      </div>
    `;

    overlay.style.display = "flex";
    body.scrollTop = 0;
    document.body.style.overflow = "hidden";

    const calcJumpBtn = document.getElementById("modal-calc-btn");
    if (calcJumpBtn) {
      calcJumpBtn.addEventListener("click", () => {
        closeDetailModal();

        state.calcCrop = row["작물명"] || "전체";
        const calcCropInput = document.getElementById("calc-crop-input");
        const calcCropClear = document.getElementById("calc-crop-clear");
        if (calcCropInput) {
          calcCropInput.value = state.calcCrop === "전체" ? "" : state.calcCrop;
        }
        if (calcCropClear) {
          calcCropClear.style.display = state.calcCrop !== "전체" ? "flex" : "none";
        }
        applySelectedPesticideToCalc(row);

        const tabCalcBtn = document.getElementById("tab-btn-calc");
        if (tabCalcBtn) tabCalcBtn.click();
        window.scrollTo({ top: 0, behavior: "smooth" });
      });
    }
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
            <div class="item-badge-group">
              <span class="item-badge">${escapeHtml(r["용도"])}</span>
              <span class="item-detail-hint">상세 ›</span>
            </div>
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
        openDetailModal(targetRow);
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
    document.getElementById("calc-pesticide-sub").textContent =
      ratio > 0 ? `${ratio.toLocaleString()}배 희석 기준` : "희석배수를 입력하세요";
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

    if (keywordInput && state.keyword) {
      keywordInput.value = state.keyword;
    }

    // 1) 검색 탭 3단 연동 콤보박스 바인딩
    bindSearchableSelect(
      "use",
      () => getUniqueOptions(allData, "용도"),
      (val) => {
        const step1 = val === "전체" ? allData : allData.filter((r) => r["용도"] === val);
        const validCrops = getUniqueOptions(step1, "작물명");
        if (state.crop !== "전체" && !validCrops.includes(state.crop)) {
          state.crop = "전체";
          const cropInput = document.getElementById("crop-input");
          const cropClear = document.getElementById("crop-clear");
          if (cropInput) cropInput.value = "";
          if (cropClear) cropClear.style.display = "none";
        }
        const step2 = state.crop === "전체" ? step1 : step1.filter((r) => r["작물명"] === state.crop);
        const validPests = getUniqueOptions(step2, "적용병해충");
        if (state.pest !== "전체" && !validPests.includes(state.pest)) {
          state.pest = "전체";
          const pestInput = document.getElementById("pest-input");
          const pestClear = document.getElementById("pest-clear");
          if (pestInput) pestInput.value = "";
          if (pestClear) pestClear.style.display = "none";
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
          const pestClear = document.getElementById("pest-clear");
          if (pestInput) pestInput.value = "";
          if (pestClear) pestClear.style.display = "none";
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

    // 2) 계산기 탭 적용작물 & 농약 검색 바인딩
    bindSearchableSelect(
      "calc-crop",
      () => getUniqueOptions(allData, "작물명"),
      (val) => {
        if (
          state.calcSelectedRow &&
          val !== "전체" &&
          state.calcSelectedRow["작물명"] !== val
        ) {
          state.calcSelectedRow = null;
          state.calcPesticideLabel = "";
          const pInput = document.getElementById("calc-pesticide-input");
          const pClear = document.getElementById("calc-pesticide-clear");
          if (pInput) pInput.value = "";
          if (pClear) pClear.style.display = "none";
          renderCalcSelectedInfo();
        }
      }
    );

    bindCalcPesticideSelect();
    renderCalcSelectedInfo();

    // 모달 닫기 이벤트
    const modalOverlay = document.getElementById("detail-modal-overlay");
    const modalCloseBtn = document.getElementById("detail-modal-close");
    if (modalCloseBtn) {
      modalCloseBtn.addEventListener("click", closeDetailModal);
    }
    if (modalOverlay) {
      modalOverlay.addEventListener("click", (e) => {
        if (e.target === modalOverlay) {
          closeDetailModal();
        }
      });
    }

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

    // 검색 탭 조건 초기화 버튼
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

    // 계산기 탭 초기화 버튼
    const calcResetBtn = document.getElementById("calc-reset-btn");
    if (calcResetBtn) {
      calcResetBtn.addEventListener("click", () => {
        state.calcCrop = "전체";
        state.calcPesticideLabel = "";
        state.calcSelectedRow = null;

        ["calc-crop", "calc-pesticide"].forEach((p) => {
          const inp = document.getElementById(`${p}-input`);
          const clr = document.getElementById(`${p}-clear`);
          const dd = document.getElementById(`${p}-dropdown`);
          if (inp) inp.value = "";
          if (clr) clr.style.display = "none";
          if (dd) dd.style.display = "none";
        });

        const radioL = document.getElementById("unit-radio-l");
        const label = document.getElementById("water-input-label");
        const waterInput = document.getElementById("water-input");
        const dilutionInput = document.getElementById("dilution-input");
        if (radioL) radioL.checked = true;
        if (label) label.textContent = "4단계. 살포할 물의 양 (L)";
        if (waterInput) waterInput.value = "20";
        if (dilutionInput) dilutionInput.value = "1000";

        renderCalcSelectedInfo();
        updateCalculator();
      });
    }

    document.getElementById("download-csv-btn").addEventListener("click", downloadCsv);

    // 희석배수 계산기 입력 이벤트
    document.querySelectorAll('input[name="unit-type"]').forEach((radio) => {
      radio.addEventListener("change", (e) => {
        const label = document.getElementById("water-input-label");
        const input = document.getElementById("water-input");
        if (e.target.value === "L") {
          label.textContent = "4단계. 살포할 물의 양 (L)";
          input.value = "20";
        } else {
          label.textContent = "4단계. 살포할 물의 양 (말)";
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
