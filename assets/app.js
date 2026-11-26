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
    calcUse: "전체",
    calcCrop: "전체",
    calcPest: "전체",
    calcPesticideLabel: "",
    calcSelectedRow: null,
    calcCustomRatio: "",
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

  // 희석배수 문자열(예: "1,000배", "500~1,000배")에서 숫자 배열 추출
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

  // 범위 희석배수 여부 판별 (예: 500~1,000배 -> { isRange: true, min: 500, max: 1000 })
  function getRangeInfo(row) {
    if (!row) return { isRange: false, ratios: [], min: 0, max: 0 };
    const ratios = parseDilutionRatios(row["희석배수"]);
    if (ratios.length >= 2) {
      const min = Math.min(...ratios);
      const max = Math.max(...ratios);
      if (min < max) {
        return { isRange: true, ratios, min, max };
      }
    }
    return { isRange: false, ratios, min: ratios[0] || 0, max: ratios[0] || 0 };
  }

  function getStateKeyForPrefix(prefix) {
    if (prefix === "calc-use") return "calcUse";
    if (prefix === "calc-crop") return "calcCrop";
    if (prefix === "calc-pest") return "calcPest";
    return prefix;
  }

  function closeAllDropdowns(exceptPrefix = "") {
    ["use", "crop", "pest", "calc-use", "calc-crop", "calc-pest", "calc-pesticide"].forEach((p) => {
      if (p !== exceptPrefix) {
        const dd = document.getElementById(`${p}-dropdown`);
        const inp = document.getElementById(`${p}-input`);
        if (dd && dd.style.display === "block") {
          dd.style.display = "none";
          if (inp) {
            if (p === "calc-pesticide") {
              inp.value = state.calcPesticideLabel || "";
            } else {
              const key = getStateKeyForPrefix(p);
              inp.value = state[key] === "전체" ? "" : state[key];
            }
          }
        }
      }
    });
  }

  document.addEventListener("click", (e) => {
    if (!e.target.closest(".combo-wrapper")) {
      closeAllDropdowns("");
    }
  });

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

    const stateKey = getStateKeyForPrefix(prefix);

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

  // 계산기 탭 1~3번 조건에 맞는 후보 농약 목록 반환
  function getCalcCandidateRows() {
    return allData.filter((r) => {
      if (state.calcUse !== "전체" && r["용도"] !== state.calcUse) return false;
      if (state.calcCrop !== "전체" && r["작물명"] !== state.calcCrop) return false;
      if (state.calcPest !== "전체" && r["적용병해충"] !== state.calcPest) return false;
      return true;
    });
  }

  function updateCalcMatchHint() {
    const hintEl = document.getElementById("calc-match-count");
    if (!hintEl) return;
    if (allData.length === 0) {
      hintEl.textContent = "데이터 로딩 중...";
      return;
    }
    const candidates = getCalcCandidateRows();
    hintEl.textContent = `현재 조건에 해당하는 농약: ${candidates.length.toLocaleString()}건`;
  }

  // 희석배수 입력창의 잠금/해제 UI 동기화
  function syncDilutionInputLockState(preserveCustomValue = false) {
    const dilutionInput = document.getElementById("dilution-input");
    const lockBadge = document.getElementById("dilution-lock-badge");
    const rangeHint = document.getElementById("dilution-range-hint");
    const labelEl = document.getElementById("dilution-input-label");
    if (!dilutionInput || !lockBadge) return;

    const row = state.calcSelectedRow;
    if (!row) {
      dilutionInput.type = "text";
      dilutionInput.readOnly = true;
      dilutionInput.tabIndex = -1;
      dilutionInput.value = "";
      dilutionInput.className = "form-control locked-ratio-input";
      lockBadge.textContent = "🔒 고정";
      lockBadge.className = "lock-fixed-badge";
      if (labelEl) labelEl.textContent = "3단계. 적용 희석배수 (범위 등록 농약만 입력 가능)";
      if (rangeHint) rangeHint.style.display = "none";
      return;
    }

    const rangeInfo = getRangeInfo(row);
    if (rangeInfo.isRange) {
      dilutionInput.type = "number";
      dilutionInput.readOnly = false;
      dilutionInput.tabIndex = 0;
      dilutionInput.min = String(rangeInfo.min);
      dilutionInput.max = String(rangeInfo.max);
      dilutionInput.step = "any";
      dilutionInput.inputMode = "numeric";
      dilutionInput.className = "form-control editable-ratio-input";

      if (!preserveCustomValue || !state.calcCustomRatio) {
        state.calcCustomRatio = String(rangeInfo.min);
      }
      dilutionInput.value = state.calcCustomRatio;

      lockBadge.textContent = "✏️ 직접 입력";
      lockBadge.className = "editable-ratio-badge";
      if (labelEl) {
        labelEl.textContent = `3단계. 적용 희석배수 (${rangeInfo.min.toLocaleString()}~${rangeInfo.max.toLocaleString()}배 범위 내 직접 입력)`;
      }
      if (rangeHint) {
        rangeHint.style.display = "block";
        rangeHint.className = "dilution-range-hint";
        rangeHint.textContent = `입력 가능 범위: ${rangeInfo.min.toLocaleString()} ~ ${rangeInfo.max.toLocaleString()}배`;
      }
    } else {
      dilutionInput.type = "text";
      dilutionInput.readOnly = true;
      dilutionInput.tabIndex = -1;
      dilutionInput.value = String(row["희석배수"] || "-");
      dilutionInput.className = "form-control locked-ratio-input";
      lockBadge.textContent = "🔒 고정";
      lockBadge.className = "lock-fixed-badge";
      if (labelEl) labelEl.textContent = "3단계. 적용 희석배수 (단일 배수 · 수정 불가)";
      if (rangeHint) rangeHint.style.display = "none";
    }
  }

  function clearCalcSelectedPesticide() {
    state.calcSelectedRow = null;
    state.calcPesticideLabel = "";
    state.calcCustomRatio = "";
    const pInput = document.getElementById("calc-pesticide-input");
    const pClear = document.getElementById("calc-pesticide-clear");
    if (pInput) pInput.value = "";
    if (pClear) pClear.style.display = "none";
    syncDilutionInputLockState(false);
    renderCalcSelectedInfo();
    updateCalculator();
  }

  // 계산기 탭 4번: 최종 농약 선택기 (상표명 / 품목명 / 성분명 검색 후 선택)
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

    function renderDropdown(query = "") {
      const baseRows = getCalcCandidateRows();
      const q = query.trim().toLowerCase();

      const matched = [];
      const seen = new Set();

      for (const r of baseRows) {
        if (q) {
          const hit =
            String(r["상표명"] || "").toLowerCase().includes(q) ||
            String(r["품목명"] || "").toLowerCase().includes(q) ||
            String(r["일반명"] || "").toLowerCase().includes(q) ||
            String(r["적용병해충"] || "").toLowerCase().includes(q);
          if (!hit) continue;
        }
        const key = `${r["상표명"]}|${r["품목명"]}|${r["작물명"]}|${r["적용병해충"]}|${r["희석배수"]}`;
        if (!seen.has(key)) {
          seen.add(key);
          matched.push(r);
          if (matched.length >= 200) break;
        }
      }

      const headerText = q
        ? `'${escapeHtml(query)}' 검색 결과 ${matched.length}건${matched.length === 200 ? " (상위 200건)" : ""} · 터치하여 선택`
        : `선택 가능한 농약 ${matched.length}건${matched.length === 200 ? " (상위 200건)" : ""} · 터치하여 선택`;

      let html = `<div class="combo-header">${headerText}</div>`;

      if (matched.length === 0) {
        html += `<div class="combo-empty">일치하는 농약이 없습니다. 위 검색 조건을 확인하세요.</div>`;
      } else {
        html += matched
          .map((r, idx) => {
            const titleText = `[${r["상표명"]}] ${r["품목명"]} (${r["작물명"]} · ${r["적용병해충"]})`;
            const subText = `성분: ${r["일반명"]} | 기준 희석배수: ${r["희석배수"]} | 사용량: ${r["사용량"]}`;
            const isSelected =
              state.calcSelectedRow &&
              state.calcSelectedRow["상표명"] === r["상표명"] &&
              state.calcSelectedRow["품목명"] === r["품목명"] &&
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
          applySelectedPesticideToCalc(chosenRow, false);
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
      clearCalcSelectedPesticide();
      dropdown.style.display = "none";
    });
  }

  // 선택한 농약의 희석배수를 계산기에 적용 (범위 농약만 입력 잠금 해제)
  function applySelectedPesticideToCalc(row, preserveCustomValue = false) {
    state.calcSelectedRow = row;
    const label = `[${row["상표명"]}] ${row["작물명"]} - ${row["적용병해충"]} (${row["희석배수"]})`;
    state.calcPesticideLabel = label;

    const inputEl = document.getElementById("calc-pesticide-input");
    const clearBtn = document.getElementById("calc-pesticide-clear");
    if (inputEl) inputEl.value = label;
    if (clearBtn) clearBtn.style.display = "flex";

    syncDilutionInputLockState(preserveCustomValue);
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

    const rangeInfo = getRangeInfo(row);
    let statusHtml = "";
    let rangeButtonsHtml = "";

    if (rangeInfo.ratios.length === 0) {
      statusHtml = `<div style="color:#dc2626;font-weight:700;margin-top:4px;">⚠️ 이 농약은 희석배수 수치가 없는 제품(원액·입제 등)입니다. 아래 기준 사용량을 확인해 살포하세요.</div>`;
    } else if (rangeInfo.isRange) {
      statusHtml = `<div style="color:#15803d;font-weight:700;margin-top:4px;">✏️ 범위로 등록된 농약입니다. <strong>${rangeInfo.min.toLocaleString()} ~ ${rangeInfo.max.toLocaleString()}배</strong> 사이에서 직접 입력하거나 아래 버튼으로 선택하세요.</div>`;
      rangeButtonsHtml = `
        <div class="calc-range-btns">
          <button type="button" class="calc-range-btn" data-set-ratio="${rangeInfo.min}">최소 ${rangeInfo.min.toLocaleString()}배 적용</button>
          <button type="button" class="calc-range-btn" data-set-ratio="${rangeInfo.max}">최대 ${rangeInfo.max.toLocaleString()}배 적용</button>
        </div>
      `;
    } else {
      statusHtml = `<div style="color:#1e40af;font-weight:700;margin-top:4px;">🔒 단일 희석배수(<strong>${escapeHtml(row["희석배수"])}</strong>)로 등록된 농약이므로 배수를 수정할 수 없습니다.</div>`;
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
        const ratioVal = btn.dataset.setRatio;
        state.calcCustomRatio = ratioVal;
        const dilutionInput = document.getElementById("dilution-input");
        if (dilutionInput) {
          dilutionInput.value = ratioVal;
        }
        updateCalculator();
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

        state.calcUse = row["용도"] || "전체";
        state.calcCrop = row["작물명"] || "전체";
        state.calcPest = row["적용병해충"] || "전체";

        [
          ["calc-use", state.calcUse],
          ["calc-crop", state.calcCrop],
          ["calc-pest", state.calcPest],
        ].forEach(([prefix, val]) => {
          const inp = document.getElementById(`${prefix}-input`);
          const clr = document.getElementById(`${prefix}-clear`);
          if (inp) inp.value = val === "전체" ? "" : val;
          if (clr) clr.style.display = val !== "전체" ? "flex" : "none";
        });

        updateCalcMatchHint();
        applySelectedPesticideToCalc(row, false);

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

  // L 단위 고정 & 단일 배수는 고정 계산, 범위 배수는 사용자 입력값(허용 범위 검증)으로 계산
  function updateCalculator() {
    const waterEl = document.getElementById("water-input");
    const dilutionEl = document.getElementById("dilution-input");
    const rangeHint = document.getElementById("dilution-range-hint");
    const waterMainEl = document.getElementById("calc-water-main");
    const pestValEl = document.getElementById("calc-pesticide-val");
    const pestSubEl = document.getElementById("calc-pesticide-sub");
    if (!waterEl || !waterMainEl || !pestValEl || !pestSubEl) return;

    const waterL = Math.max(0, parseFloat(waterEl.value) || 0);
    const waterMl = waterL * 1000.0;

    waterMainEl.textContent = `${waterL.toLocaleString(undefined, {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    })} L`;

    const row = state.calcSelectedRow;
    if (!row) {
      pestValEl.textContent = "-";
      pestSubEl.textContent = "농약을 먼저 선택하세요";
      return;
    }

    const rangeInfo = getRangeInfo(row);
    if (rangeInfo.ratios.length === 0) {
      pestValEl.textContent = "희석 불필요";
      pestSubEl.textContent = `기준 사용량(${row["사용량"]}) 참고`;
      return;
    }

    if (rangeInfo.isRange) {
      const typedVal = dilutionEl ? parseFloat(dilutionEl.value) : NaN;
      if (
        isNaN(typedVal) ||
        typedVal < rangeInfo.min ||
        typedVal > rangeInfo.max
      ) {
        pestValEl.textContent = "-";
        pestSubEl.textContent = `허용 범위(${rangeInfo.min.toLocaleString()}~${rangeInfo.max.toLocaleString()}배) 내 값을 입력하세요`;
        if (rangeHint) {
          rangeHint.style.display = "block";
          rangeHint.className = "dilution-range-hint error";
          rangeHint.textContent = `⚠️ 등록 범위(${rangeInfo.min.toLocaleString()} ~ ${rangeInfo.max.toLocaleString()}배) 내의 숫자만 입력 가능합니다.`;
        }
        return;
      }

      if (rangeHint) {
        rangeHint.style.display = "block";
        rangeHint.className = "dilution-range-hint";
        rangeHint.textContent = `입력 가능 범위: ${rangeInfo.min.toLocaleString()} ~ ${rangeInfo.max.toLocaleString()}배`;
      }

      const pesticideMl = waterMl / typedVal;
      pestValEl.textContent = `${pesticideMl.toLocaleString(undefined, {
        minimumFractionDigits: 1,
        maximumFractionDigits: 1,
      })} mL (또는 g)`;
      pestSubEl.textContent = `${typedVal.toLocaleString()}배 적용 기준 (등록: ${row["희석배수"]})`;
    } else {
      const pesticideMl = waterMl / rangeInfo.min;
      pestValEl.textContent = `${pesticideMl.toLocaleString(undefined, {
        minimumFractionDigits: 1,
        maximumFractionDigits: 1,
      })} mL (또는 g)`;
      pestSubEl.textContent = `${row["희석배수"]} 고정 기준`;
    }
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
      updateCalcMatchHint();
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

    // 2) 계산기 탭: '농약 검색'과 동일 순서(1. 용도 → 2. 작물 → 3. 병해충 → 4. 농약 선택)
    function validateCalcSelectionAfterFilterChange() {
      updateCalcMatchHint();
      if (!state.calcSelectedRow) return;
      const r = state.calcSelectedRow;
      const stillMatches =
        (state.calcUse === "전체" || r["용도"] === state.calcUse) &&
        (state.calcCrop === "전체" || r["작물명"] === state.calcCrop) &&
        (state.calcPest === "전체" || r["적용병해충"] === state.calcPest);
      if (!stillMatches) {
        clearCalcSelectedPesticide();
      }
    }

    bindSearchableSelect(
      "calc-use",
      () => getUniqueOptions(allData, "용도"),
      (val) => {
        const step1 = val === "전체" ? allData : allData.filter((r) => r["용도"] === val);
        const validCrops = getUniqueOptions(step1, "작물명");
        if (state.calcCrop !== "전체" && !validCrops.includes(state.calcCrop)) {
          state.calcCrop = "전체";
          const cropInput = document.getElementById("calc-crop-input");
          const cropClear = document.getElementById("calc-crop-clear");
          if (cropInput) cropInput.value = "";
          if (cropClear) cropClear.style.display = "none";
        }
        const step2 = state.calcCrop === "전체" ? step1 : step1.filter((r) => r["작물명"] === state.calcCrop);
        const validPests = getUniqueOptions(step2, "적용병해충");
        if (state.calcPest !== "전체" && !validPests.includes(state.calcPest)) {
          state.calcPest = "전체";
          const pestInput = document.getElementById("calc-pest-input");
          const pestClear = document.getElementById("calc-pest-clear");
          if (pestInput) pestInput.value = "";
          if (pestClear) pestClear.style.display = "none";
        }
        validateCalcSelectionAfterFilterChange();
      }
    );

    bindSearchableSelect(
      "calc-crop",
      () => {
        const step1 = state.calcUse === "전체" ? allData : allData.filter((r) => r["용도"] === state.calcUse);
        return getUniqueOptions(step1, "작물명");
      },
      (val) => {
        const step1 = state.calcUse === "전체" ? allData : allData.filter((r) => r["용도"] === state.calcUse);
        const step2 = val === "전체" ? step1 : step1.filter((r) => r["작물명"] === val);
        const validPests = getUniqueOptions(step2, "적용병해충");
        if (state.calcPest !== "전체" && !validPests.includes(state.calcPest)) {
          state.calcPest = "전체";
          const pestInput = document.getElementById("calc-pest-input");
          const pestClear = document.getElementById("calc-pest-clear");
          if (pestInput) pestInput.value = "";
          if (pestClear) pestClear.style.display = "none";
        }
        validateCalcSelectionAfterFilterChange();
      }
    );

    bindSearchableSelect(
      "calc-pest",
      () => {
        const step1 = state.calcUse === "전체" ? allData : allData.filter((r) => r["용도"] === state.calcUse);
        const step2 = state.calcCrop === "전체" ? step1 : step1.filter((r) => r["작물명"] === state.calcCrop);
        return getUniqueOptions(step2, "적용병해충");
      },
      () => {
        validateCalcSelectionAfterFilterChange();
      }
    );

    bindCalcPesticideSelect();
    updateCalcMatchHint();
    if (state.calcSelectedRow) {
      applySelectedPesticideToCalc(state.calcSelectedRow, true);
    } else {
      syncDilutionInputLockState(false);
      renderCalcSelectedInfo();
    }

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
        state.calcUse = "전체";
        state.calcCrop = "전체";
        state.calcPest = "전체";
        state.calcPesticideLabel = "";
        state.calcSelectedRow = null;
        state.calcCustomRatio = "";

        ["calc-use", "calc-crop", "calc-pest", "calc-pesticide"].forEach((p) => {
          const inp = document.getElementById(`${p}-input`);
          const clr = document.getElementById(`${p}-clear`);
          const dd = document.getElementById(`${p}-dropdown`);
          if (inp) inp.value = "";
          if (clr) clr.style.display = "none";
          if (dd) dd.style.display = "none";
        });

        const waterInput = document.getElementById("water-input");
        if (waterInput) waterInput.value = "20";

        syncDilutionInputLockState(false);
        updateCalcMatchHint();
        renderCalcSelectedInfo();
        updateCalculator();
      });
    }

    document.getElementById("download-csv-btn").addEventListener("click", downloadCsv);

    // 살포할 물의 양(L) 및 범위 희석배수 직접 입력 이벤트
    const waterInput = document.getElementById("water-input");
    const dilutionInput = document.getElementById("dilution-input");

    waterInput.addEventListener("input", updateCalculator);
    waterInput.addEventListener("change", updateCalculator);

    dilutionInput.addEventListener("input", () => {
      if (dilutionInput.readOnly) return;
      state.calcCustomRatio = dilutionInput.value;
      updateCalculator();
    });

    dilutionInput.addEventListener("blur", () => {
      if (dilutionInput.readOnly || !state.calcSelectedRow) return;
      const rangeInfo = getRangeInfo(state.calcSelectedRow);
      if (!rangeInfo.isRange) return;

      let val = parseFloat(dilutionInput.value);
      if (isNaN(val) || val < rangeInfo.min) {
        val = rangeInfo.min;
      } else if (val > rangeInfo.max) {
        val = rangeInfo.max;
      }
      state.calcCustomRatio = String(val);
      dilutionInput.value = state.calcCustomRatio;
      updateCalculator();
    });

    updateCalculator();

    // 이미 데이터가 로드된 상태(React 재렌더링 직후)라면 즉시 화면 갱신
    if (allData.length > 0) {
      applyFilters();
      updateCalcMatchHint();
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
